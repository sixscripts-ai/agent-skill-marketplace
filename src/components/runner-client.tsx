"use client";

import { useMemo, useState } from "react";
import { SafeMessageResponse } from "@/components/safe-message-response";
import { sandboxProviders } from "@/lib/providers";
import { detectRunnableCommands } from "@/lib/run-state";
import type { ExecutionMode, PermissionKey, SandboxProvider, Skill, SkillPermission, SkillRun, SkillTraceEvent, WorkspaceFile } from "@/lib/types";
import { Badge, ButtonLink, Panel } from "./ui";

const RUNTIME_SHELL_PERMISSION: SkillPermission = {
  key: "shell",
  reason: "Execute the approved command inside an isolated Vercel Sandbox microVM.",
  risk: "high",
};

export function RunnerClient({ skill, initialRun }: { skill: Skill; initialRun: SkillRun }) {
  const initialWorkspace = initialRun.workspaceFiles ?? [];
  const initialCommands = detectRunnableCommands(skill, initialWorkspace);
  const [input, setInput] = useState(initialRun.input || "Run this skill against the uploaded package and produce artifacts.");
  const [denied, setDenied] = useState<string[]>([]);
  const [provider, setProvider] = useState<SandboxProvider>(initialRun.provider ?? "openai");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(initialRun.sandbox?.executionMode ?? "virtual-agent");
  const [command, setCommand] = useState(initialRun.sandbox?.command ?? initialCommands[0] ?? "");
  const [networkAllowlist, setNetworkAllowlist] = useState("registry.npmjs.org,github.com");
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>(initialWorkspace);
  const [run, setRun] = useState<SkillRun>(initialRun);
  const [isRunning, setIsRunning] = useState(false);

  const detectedCommands = useMemo(() => detectRunnableCommands(skill, workspaceFiles), [skill, workspaceFiles]);
  const permissions = useMemo(() => {
    if (executionMode !== "real-shell" || skill.permissions.some((permission) => permission.key === "shell")) {
      return skill.permissions;
    }
    return [...skill.permissions, RUNTIME_SHELL_PERMISSION];
  }, [executionMode, skill.permissions]);
  const allApproved = useMemo(
    () => permissions.every((permission) => !denied.includes(permission.key)),
    [denied, permissions],
  );
  const selectedProvider = sandboxProviders.find((item) => item.id === provider) ?? sandboxProviders[0];

  function togglePermission(permission: PermissionKey) {
    setDenied((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
  }

  function addWorkspaceFile() {
    setWorkspaceFiles((current) => [
      ...current,
      {
        path: `workspace/file-${current.length + 1}.md`,
        content: "# Workspace file\n\nAdd real context for this run.",
        size: 48,
        updatedAt: new Date().toISOString(),
      },
    ]);
  }

  async function execute() {
    setIsRunning(true);
    const response = await fetch("/api/runs/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        skillSlug: skill.slug,
        input,
        deniedPermissions: denied,
        provider,
        executionMode,
        command,
        networkAllowlist: networkAllowlist
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        workspaceFiles,
        replayOf: initialRun.status === "pending" ? undefined : initialRun.id,
      }),
    });

    if (!response.body) {
      setRun((current) => ({
        ...current,
        status: "failed",
        output: "Run stream failed to start. No run was created.",
      }));
      setIsRunning(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.split("\n").find((item) => item.startsWith("data: "));
        if (!line) continue;
        const payload = JSON.parse(line.slice(6)) as
          | { kind: "run"; run: SkillRun }
          | { kind: "event"; event: SkillTraceEvent }
          | { kind: "output"; output: string }
          | { kind: "complete"; run: SkillRun };
        if (payload.kind === "run" || payload.kind === "complete") {
          setRun(payload.run);
        } else if (payload.kind === "event") {
          setRun((current) => ({
            ...current,
            events: [...current.events.filter((event) => event.order !== payload.event.order), payload.event].sort(
              (a, b) => a.order - b.order,
            ),
          }));
        } else if (payload.kind === "output") {
          setRun((current) => ({ ...current, output: payload.output }));
        }
      }
    }
    setIsRunning(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Run {skill.name}</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Execute uploaded skill files in an isolated Vercel Sandbox or use the virtual provider route for agent-only runs.
          </p>
        </div>
        <Badge tone={allApproved ? "green" : "amber"}>{allApproved ? "approved" : "restricted"}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Panel className="p-5">
          <div className="flex flex-col gap-6">
            <label className="block text-sm font-medium text-neutral-700">
              Prompt
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="mt-2 min-h-36 w-full rounded-md border p-3 text-sm leading-6 outline-none"
              />
            </label>

            <div className="grid gap-4">
              <label className="block text-sm font-medium text-neutral-700">
                Execution mode
                <select
                  value={executionMode}
                  onChange={(event) => setExecutionMode(event.target.value as ExecutionMode)}
                  className="mt-2 h-10 w-full rounded-md border px-3 text-sm outline-none"
                >
                  <option value="virtual-agent">Virtual provider route</option>
                  <option value="real-shell">Real shell sandbox</option>
                </select>
              </label>

              {executionMode === "real-shell" ? (
                <>
                  <label className="block text-sm font-medium text-neutral-700">
                    Approved command
                    <input
                      value={command}
                      onChange={(event) => setCommand(event.target.value)}
                      placeholder="npm test"
                      className="mt-2 h-10 w-full rounded-md border px-3 font-mono text-sm outline-none"
                    />
                  </label>
                  {detectedCommands.length ? (
                    <div className="flex flex-wrap gap-2">
                      {detectedCommands.map((item) => (
                        <button
                          key={item}
                          onClick={() => setCommand(item)}
                          className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-xs text-neutral-900 transition hover:bg-neutral-100"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm leading-5 text-neutral-600">
                      No package script was detected. Enter the exact command to run inside the sandbox.
                    </div>
                  )}
                  <label className="block text-sm font-medium text-neutral-700">
                    Network allowlist
                    <input
                      value={networkAllowlist}
                      onChange={(event) => setNetworkAllowlist(event.target.value)}
                      placeholder="registry.npmjs.org,github.com"
                      className="mt-2 h-10 w-full rounded-md border px-3 text-sm outline-none"
                    />
                  </label>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="block text-sm font-medium text-neutral-700">
                    Provider
                    <select
                      value={provider}
                      onChange={(event) => setProvider(event.target.value as SandboxProvider)}
                      className="mt-2 h-10 w-full rounded-md border px-3 text-sm outline-none"
                    >
                      {sandboxProviders.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} - {item.model}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Mode</div>
                    <div className="mt-2 text-sm text-neutral-700">
                      {selectedProvider.mode === "openai-compatible"
                        ? `Streams live with ${selectedProvider.keyEnv} when configured; otherwise uses local deterministic provider output.`
                        : "Local deterministic provider route."}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-neutral-950">Workspace files</h2>
                <button
                  onClick={addWorkspaceFile}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100"
                >
                  Add file
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {workspaceFiles.length ? (
                  workspaceFiles.map((file, index) => (
                    <div key={`${file.path}-${index}`} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                      <input
                        value={file.path}
                        onChange={(event) =>
                          setWorkspaceFiles((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, path: event.target.value, updatedAt: new Date().toISOString() } : item,
                            ),
                          )
                        }
                        className="h-9 w-full rounded-md border px-3 font-mono text-xs outline-none"
                      />
                      <textarea
                        value={file.content}
                        onChange={(event) =>
                          setWorkspaceFiles((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    content: event.target.value,
                                    size: event.target.value.length,
                                    updatedAt: new Date().toISOString(),
                                  }
                                : item,
                            ),
                          )
                        }
                        className="mt-2 min-h-24 w-full rounded-md border p-3 font-mono text-xs leading-5 outline-none"
                      />
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                    No workspace files are attached. Upload a skill package in Builder or add a file here before running context-dependent commands.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-neutral-950">Permission approval</h2>
              <div className="mt-3 flex flex-col gap-3">
                {permissions.map((permission) => {
                  const isDenied = denied.includes(permission.key);
                  return (
                    <button
                      key={permission.key}
                      onClick={() => togglePermission(permission.key)}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        isDenied ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm text-neutral-950">{permission.key}</span>
                        <span className="text-xs text-neutral-500">{isDenied ? "denied" : "approved"}</span>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-neutral-600">{permission.reason}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={execute}
              disabled={isRunning}
              className="h-11 w-full rounded-md border border-neutral-950 bg-neutral-950 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
            >
              {isRunning ? "Streaming run..." : executionMode === "real-shell" ? "Run real shell sandbox" : "Run virtual provider route"}
            </button>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-5">
            <div>
              <h2 className="font-semibold text-neutral-950">Execution trace</h2>
              <p className="mt-1 font-mono text-sm text-neutral-500">{run.id}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {run.status !== "pending" ? <ButtonLink href={`/traces/${run.id}`} variant="secondary">Open saved trace</ButtonLink> : null}
              {run.status !== "pending" ? <ButtonLink href={`/api/traces/${run.id}`} variant="secondary">JSON</ButtonLink> : null}
              {run.status !== "pending" ? <ButtonLink href={`/api/workspaces/${run.id}`} variant="secondary">Workspace zip</ButtonLink> : null}
            </div>
          </div>
          <div className="grid gap-4 border-b border-neutral-200 p-5 sm:grid-cols-3">
            <RunMetric label="status" value={run.status} />
            <RunMetric label="latency" value={`${run.latencyMs}ms`} />
            <RunMetric label="mode" value={run.sandbox?.executionMode ?? executionMode} />
          </div>
          <div className="max-h-[520px] overflow-auto p-5">
            <div className="flex flex-col gap-3">
              {run.events.length ? (
                run.events.map((event) => (
                  <div key={`${event.order}-${event.title}`} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-7 place-items-center rounded-full bg-neutral-950 font-mono text-xs text-white">
                          {event.order}
                        </span>
                        <span className="font-medium text-neutral-950">{event.title}</span>
                      </div>
                      <Badge tone={event.status === "blocked" || event.status === "failed" ? "red" : event.status === "warning" ? "amber" : "green"}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-neutral-600">{event.detail}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                  No trace events yet. Start a run to create a persisted execution trace.
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-neutral-200 bg-neutral-50 p-5">
            <h3 className="text-sm font-semibold text-neutral-950">Output</h3>
            <div className="mt-2">
              <SafeMessageResponse>{run.output || "No output yet."}</SafeMessageResponse>
            </div>
          </div>
          {run.artifacts?.length ? (
            <div className="border-t border-neutral-200 p-5">
              <h3 className="text-sm font-semibold text-neutral-950">Artifacts</h3>
              <div className="mt-3 flex flex-col gap-3">
                {run.artifacts.map((artifact) => (
                  <div key={artifact.path} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm text-neutral-950">{artifact.path}</span>
                      <Badge tone={artifact.kind === "created" ? "green" : "blue"}>{artifact.kind}</Badge>
                    </div>
                    <div className="mt-3 max-h-72 overflow-auto rounded-md border border-neutral-200 bg-white p-3">
                      <SafeMessageResponse>{artifact.after}</SafeMessageResponse>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function RunMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-neutral-950">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</div>
    </div>
  );
}
