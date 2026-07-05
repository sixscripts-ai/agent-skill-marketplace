"use client";

import { useMemo, useState } from "react";
import { buildMockRun } from "@/lib/runner";
import { sandboxProviders } from "@/lib/providers";
import type { SandboxProvider, Skill, SkillRun, SkillTraceEvent, WorkspaceFile } from "@/lib/types";
import { Badge, ButtonLink, Panel } from "./ui";

export function RunnerClient({ skill, initialRun }: { skill: Skill; initialRun?: SkillRun }) {
  const [input, setInput] = useState("Audit the last failed agent run and produce a replay plan.");
  const [denied, setDenied] = useState<string[]>([]);
  const [provider, setProvider] = useState<SandboxProvider>(initialRun?.provider ?? "openai");
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>(
    initialRun?.workspaceFiles?.length
      ? initialRun.workspaceFiles
      : [
          {
            path: "workspace/context.md",
            content: "# Demo workspace\n\nThe sandbox should inspect this file and write a report artifact.",
            size: 86,
            updatedAt: new Date().toISOString(),
          },
        ],
  );
  const [run, setRun] = useState<SkillRun>(
    () => initialRun ?? buildMockRun(skill.slug, "Audit the last failed agent run and produce a replay plan."),
  );
  const [isRunning, setIsRunning] = useState(false);

  const allApproved = useMemo(
    () => skill.permissions.every((permission) => !denied.includes(permission.key)),
    [denied, skill.permissions],
  );
  const selectedProvider = sandboxProviders.find((item) => item.id === provider) ?? sandboxProviders[0];

  function togglePermission(permission: string) {
    setDenied((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
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
        workspaceFiles,
        replayOf: initialRun?.id,
      }),
    });
    if (!response.body) {
      setRun(buildMockRun(skill.slug, input, denied));
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
            Stream a browser-safe sandbox run with provider routing, permission checks, virtual tools, and saved traces.
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
                    ? `Streams live with ${selectedProvider.keyEnv} when configured; otherwise simulated.`
                    : "Simulated provider route."}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-neutral-950">Workspace files</h2>
                <button
                  onClick={() =>
                    setWorkspaceFiles((current) => [
                      ...current,
                      {
                        path: `workspace/file-${current.length + 1}.md`,
                        content: "# New file\n\nAdd context for the sandbox.",
                        size: 38,
                        updatedAt: new Date().toISOString(),
                      },
                    ])
                  }
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100"
                >
                  Add file
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {workspaceFiles.map((file, index) => (
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
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-neutral-950">Permission approval</h2>
              <div className="mt-3 flex flex-col gap-3">
                {skill.permissions.map((permission) => {
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
              {isRunning ? "Streaming sandbox..." : "Run live sandbox"}
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
              <ButtonLink href={`/traces/${run.id}`} variant="secondary">Open saved trace</ButtonLink>
              <ButtonLink href={`/api/traces/${run.id}`} variant="secondary">JSON</ButtonLink>
              <ButtonLink href={`/api/workspaces/${run.id}`} variant="secondary">Workspace zip</ButtonLink>
            </div>
          </div>
          <div className="grid gap-4 border-b border-neutral-200 p-5 sm:grid-cols-3">
            <RunMetric label="status" value={run.status} />
            <RunMetric label="latency" value={`${run.latencyMs}ms`} />
            <RunMetric label="provider" value={run.provider ?? provider} />
          </div>
          <div className="max-h-[520px] overflow-auto p-5">
            <div className="flex flex-col gap-3">
              {run.events.map((event) => (
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
              ))}
            </div>
          </div>
          <div className="border-t border-neutral-200 bg-neutral-50 p-5">
            <h3 className="text-sm font-semibold text-neutral-950">Output</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-700">{run.output}</p>
          </div>
          {run.artifacts?.length ? (
            <div className="border-t border-neutral-200 p-5">
              <h3 className="text-sm font-semibold text-neutral-950">Workspace artifact diff</h3>
              <div className="mt-3 flex flex-col gap-3">
                {run.artifacts.map((artifact) => (
                  <div key={artifact.path} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm text-neutral-950">{artifact.path}</span>
                      <Badge tone={artifact.kind === "created" ? "green" : "blue"}>{artifact.kind}</Badge>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <pre className="max-h-52 overflow-auto rounded-md border border-neutral-200 bg-white p-3 text-xs leading-5 text-neutral-600">
                        {artifact.before ?? "(new file)"}
                      </pre>
                      <pre className="max-h-52 overflow-auto rounded-md border border-neutral-200 bg-white p-3 text-xs leading-5 text-neutral-900">
                        {artifact.after}
                      </pre>
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
