import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import { Badge, ButtonLink, Panel } from "@/components/ui";
import { skills } from "@/lib/data";
import { buildMockRun } from "@/lib/runner";
import { findRun, saveRun } from "@/lib/repository";

export default async function TracePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const persisted = await findRun(runId);
  const skill = skills.find((item) => runId.startsWith(item.slug)) ?? skills[0];
  const run = persisted ?? buildMockRun(skill.slug, "Replayed trace from persisted run identifier.");
  if (!persisted) await saveRun(run);

  return (
    <AppShell>
      <div className="space-y-6">
        <Panel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-white">Trace {runId}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Full execution record for {run.skillName}: permissions, model steps, tool calls, warnings, output, latency, and cost.
              </p>
            </div>
            <div className="flex gap-3">
              <ButtonLink href={`/skills/${run.skillSlug}/run?replay=${run.id}`} variant="secondary">Replay</ButtonLink>
              <ButtonLink href={`/api/traces/${runId}`} variant="secondary">Export JSON</ButtonLink>
              <ButtonLink href={`/api/workspaces/${run.id}`} variant="secondary">Workspace zip</ButtonLink>
            </div>
          </div>
        </Panel>
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Panel className="p-5">
            <h2 className="font-semibold text-white">Timeline</h2>
            <div className="mt-4 space-y-3">
              {run.events.map((event) => (
                <div key={`${event.order}-${event.title}`} className="glass-subtle rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-500">{String(event.order).padStart(2, "0")}</span>
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
          </Panel>
          <div className="space-y-6">
            <Panel className="p-5">
              <h2 className="font-semibold text-white">Run metadata</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Meta label="Skill" value={run.skillName} />
                <Meta label="Version" value={run.version} />
                <Meta label="Status" value={run.status} />
                <Meta label="Provider" value={run.provider ?? "virtual"} />
                <Meta label="Model" value={run.model ?? "sandbox-model"} />
                {run.replayOf ? <Meta label="Replay of" value={run.replayOf} /> : null}
                <Meta label="Latency" value={`${run.latencyMs}ms`} />
                <Meta label="Estimated cost" value={`$${run.estimatedCost}`} />
              </dl>
            </Panel>
            {run.workspaceFiles?.length ? (
              <Panel className="p-5">
                <h2 className="font-semibold text-white">Workspace files</h2>
                <div className="mt-3 space-y-2">
                  {run.workspaceFiles.map((file) => (
                    <div key={file.path} className="glass-subtle rounded-xl p-3">
                      <div className="font-mono text-xs text-cyan-100">{file.path}</div>
                      <div className="mt-1 text-xs text-slate-500">{file.size} bytes</div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
            {run.artifacts?.length ? (
              <Panel className="p-5">
                <h2 className="font-semibold text-white">Artifacts</h2>
                <div className="mt-3 space-y-3">
                  {run.artifacts.map((artifact) => (
                    <div key={artifact.path} className="glass-subtle rounded-xl p-3">
                      <div className="font-mono text-xs text-cyan-100">{artifact.path}</div>
                      <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/30 p-3 text-xs leading-5 text-slate-300">
                        {artifact.after}
                      </pre>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
            <Panel className="p-5">
              <h2 className="font-semibold text-white">Output</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{run.output}</p>
            </Panel>
            <Panel className="p-5">
              <h2 className="font-semibold text-white">JSON preview</h2>
              <div className="mt-3">
                <CodeBlock code={JSON.stringify(run, null, 2)} />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-white">{value}</dd>
    </div>
  );
}
