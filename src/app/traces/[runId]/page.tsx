import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MessageResponse } from "@/components/ai-elements/message";
import { CodeBlock } from "@/components/code-block";
import { Badge, ButtonLink, Panel } from "@/components/ui";
import { findRun } from "@/lib/repository";

export default async function TracePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await findRun(runId);
  if (!run) notFound();

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <Panel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-neutral-950">Trace {runId}</h1>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
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
            <h2 className="font-semibold text-neutral-950">Timeline</h2>
            <div className="mt-4 flex flex-col gap-3">
              {run.events.map((event) => (
                <div key={`${event.order}-${event.title}`} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-7 place-items-center rounded-full bg-neutral-950 font-mono text-xs text-white">
                        {String(event.order).padStart(2, "0")}
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
          </Panel>
          <div className="flex flex-col gap-6">
            <Panel className="p-5">
              <h2 className="font-semibold text-neutral-950">Run metadata</h2>
              <dl className="mt-4 flex flex-col gap-3 text-sm">
                <Meta label="Skill" value={run.skillName} />
                <Meta label="Version" value={run.version} />
                <Meta label="Status" value={run.status} />
                <Meta label="Provider" value={run.provider ?? "virtual"} />
                <Meta label="Model" value={run.model ?? "sandbox-model"} />
                {run.sandbox?.command ? <Meta label="Command" value={run.sandbox.command} /> : null}
                {run.sandbox?.exitCode !== undefined ? <Meta label="Exit code" value={String(run.sandbox.exitCode)} /> : null}
                {run.sandbox?.networkPolicy ? <Meta label="Network" value={run.sandbox.networkPolicy} /> : null}
                {run.replayOf ? <Meta label="Replay of" value={run.replayOf} /> : null}
                <Meta label="Latency" value={`${run.latencyMs}ms`} />
                <Meta label="Estimated cost" value={`$${run.estimatedCost}`} />
              </dl>
            </Panel>
            {run.workspaceFiles?.length ? (
              <Panel className="p-5">
                <h2 className="font-semibold text-neutral-950">Workspace files</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {run.workspaceFiles.map((file) => (
                    <div key={file.path} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                      <div className="font-mono text-xs text-neutral-950">{file.path}</div>
                      <div className="mt-1 text-xs text-neutral-500">{file.size} bytes</div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
            {run.artifacts?.length ? (
              <Panel className="p-5">
                <h2 className="font-semibold text-neutral-950">Artifacts</h2>
                <div className="mt-3 flex flex-col gap-3">
                  {run.artifacts.map((artifact) => (
                    <div key={artifact.path} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                      <div className="font-mono text-xs text-neutral-950">{artifact.path}</div>
                      <div className="mt-2 max-h-40 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-3">
                        <MessageResponse>{artifact.after}</MessageResponse>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
            <Panel className="p-5">
              <h2 className="font-semibold text-neutral-950">Output</h2>
              <div className="mt-3">
                <MessageResponse>{run.output || "No output saved."}</MessageResponse>
              </div>
            </Panel>
            <Panel className="p-5">
              <h2 className="font-semibold text-neutral-950">JSON preview</h2>
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
    <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3 last:border-b-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-950">{value}</dd>
    </div>
  );
}
