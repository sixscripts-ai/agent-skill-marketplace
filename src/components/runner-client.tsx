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
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <Panel className="p-5" variant="floating">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Run {skill.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Stream a live browser sandbox run with permission decisions, virtual tool calls, trace events, and artifacts.
            </p>
          </div>
          <Badge tone={allApproved ? "green" : "amber"}>{allApproved ? "approved" : "restricted"}</Badge>
        </div>

        <label className="mt-6 block text-sm font-medium text-slate-300">Prompt</label>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="mt-2 min-h-36 w-full rounded-md border border-white/10 bg-slate-950 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/60"
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-300">
            Provider
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as SandboxProvider)}
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
            >
              {sandboxProviders.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} - {item.model}
                </option>
              ))}
            </select>
          </label>
          <div className="glass-subtle rounded-xl p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Mode</div>
            <div className="mt-2 text-sm text-slate-200">
              {selectedProvider.mode === "openai-compatible"
                ? `Streams live with ${selectedProvider.keyEnv} when configured; otherwise simulated.`
                : "Simulated provider route."}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Workspace files</h2>
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
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/[0.08]"
            >
              Add file
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {workspaceFiles.map((file, index) => (
              <div key={`${file.path}-${index}`} className="glass-subtle rounded-xl p-3">
                <input
                  value={file.path}
                  onChange={(event) =>
                    setWorkspaceFiles((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, path: event.target.value, updatedAt: new Date().toISOString() } : item,
                      ),
                    )
                  }
                  className="h-9 w-full rounded-md border border-white/10 bg-slate-950 px-3 font-mono text-xs text-white outline-none focus:border-cyan-300/60"
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
                  className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-slate-950 p-3 font-mono text-xs leading-5 text-white outline-none focus:border-cyan-300/60"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-white">Permission approval</h2>
          <div className="mt-3 space-y-3">
            {skill.permissions.map((permission) => {
              const isDenied = denied.includes(permission.key);
              return (
                <button
                  key={permission.key}
                  onClick={() => togglePermission(permission.key)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    isDenied
                      ? "border-amber-400/40 bg-amber-400/10"
                      : "border-emerald-400/25 bg-emerald-400/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-white">{permission.key}</span>
                    <span className="text-xs text-slate-400">{isDenied ? "denied" : "approved"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-400">{permission.reason}</p>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={execute}
          disabled={isRunning}
          className="mt-6 h-11 w-full rounded-md bg-cyan-300 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
        >
          {isRunning ? "Streaming sandbox..." : "Run live sandbox"}
        </button>
      </Panel>

      <Panel className="overflow-hidden" variant="floating">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="font-semibold text-white">Execution trace</h2>
            <p className="mt-1 text-sm text-slate-500">{run.id}</p>
          </div>
          <div className="flex gap-3">
            <ButtonLink href={`/traces/${run.id}`} variant="secondary">Open saved trace</ButtonLink>
            <ButtonLink href={`/api/traces/${run.id}`} variant="secondary">JSON</ButtonLink>
            <ButtonLink href={`/api/workspaces/${run.id}`} variant="secondary">Workspace zip</ButtonLink>
          </div>
        </div>
        <div className="grid gap-4 border-b border-white/10 p-5 sm:grid-cols-3">
          <RunMetric label="status" value={run.status} />
          <RunMetric label="latency" value={`${run.latencyMs}ms`} />
          <RunMetric label="provider" value={run.provider ?? provider} />
        </div>
        <div className="max-h-[520px] space-y-3 overflow-auto p-5">
          {run.events.map((event) => (
            <div key={`${event.order}-${event.title}`} className="glass-subtle rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded bg-white/[0.06] font-mono text-xs text-slate-300">
                    {event.order}
                  </span>
                  <span className="font-medium text-white">{event.title}</span>
                </div>
                <Badge tone={event.status === "blocked" || event.status === "failed" ? "red" : event.status === "warning" ? "amber" : "green"}>
                  {event.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{event.detail}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 bg-white/[0.035] p-5">
          <h3 className="text-sm font-semibold text-white">Output</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{run.output}</p>
        </div>
        {run.artifacts?.length ? (
          <div className="border-t border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white">Workspace artifact diff</h3>
            <div className="mt-3 space-y-3">
              {run.artifacts.map((artifact) => (
                <div key={artifact.path} className="glass-subtle rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-white">{artifact.path}</span>
                    <Badge tone={artifact.kind === "created" ? "green" : "blue"}>{artifact.kind}</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <pre className="max-h-52 overflow-auto rounded-md bg-black/30 p-3 text-xs leading-5 text-red-100">
                      {artifact.before ?? "(new file)"}
                    </pre>
                    <pre className="max-h-52 overflow-auto rounded-md bg-black/30 p-3 text-xs leading-5 text-emerald-100">
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
  );
}

function RunMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
    </div>
  );
}
