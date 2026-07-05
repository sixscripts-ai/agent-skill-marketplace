"use client";

import type { ReactNode } from "react";
import { FileTree, FileTreeFile, FileTreeFolder } from "@/components/ai-elements/file-tree";
import { FeatureWalkthrough } from "@/components/feature-walkthrough";
import { Terminal } from "@/components/ai-elements/terminal";
import { Tool, ToolContent, ToolHeader, ToolInput, type ToolPart } from "@/components/ai-elements/tool";
import { SafeMessageResponse } from "@/components/safe-message-response";
import { CodeBlock } from "@/components/code-block";
import { Badge, ButtonLink, Panel } from "@/components/ui";
import type { SandboxArtifact, SkillRun, SkillTraceEvent, WorkspaceFile } from "@/lib/types";

type TraceFileRecord = {
  path: string;
  content: string;
  source: "workspace" | "artifact";
  size: number;
};

type TreeNode = {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: TraceFileRecord;
};

export function TraceClient({ run }: { run: SkillRun }) {
  const fileRecords = collectTraceFiles(run.workspaceFiles ?? [], run.artifacts ?? []);
  const terminalOutput = buildTraceTerminalOutput(run);

  return (
    <div className="flex flex-col gap-6">
      <Panel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Persisted trace</div>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Trace {run.id}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Full execution record for {run.skillName}: permissions, tool calls, terminal output, files, artifacts, and final response.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/skills/${run.skillSlug}/run?replay=${run.id}`} variant="secondary">
              Replay
            </ButtonLink>
            <ButtonLink href={`/api/traces/${run.id}`} variant="secondary">
              Export JSON
            </ButtonLink>
            <ButtonLink href={`/api/workspaces/${run.id}`} variant="secondary">
              Workspace zip
            </ButtonLink>
          </div>
        </div>
      </Panel>

      <FeatureWalkthrough
        title="Traces explain exactly what happened during a run."
        description="Use this page when a run succeeds, fails, or behaves unexpectedly. The trace is the audit record: inputs, permissions, tools, terminal output, files, artifacts, and final response."
        example="Open a failed run, read the first blocked or failed tool event, then replay the run with corrected permissions or a clearer prompt."
        why="Traces make the sandbox trustworthy. They let users inspect the evidence instead of accepting an agent answer blindly."
        items={[
          {
            title: "Tool timeline",
            body: "The ordered list of permission checks, tool calls, warnings, artifacts, and errors captured during the run.",
          },
          {
            title: "Terminal",
            body: "For real shell runs, this shows command lifecycle output and exit status. For virtual runs, it explains that no shell output exists.",
          },
          {
            title: "Files and artifacts",
            body: "Shows the workspace files and generated reports that belong to the run.",
          },
          {
            title: "Replay and exports",
            body: "Replay loads the same run context. JSON and workspace zip let you inspect or share the raw evidence.",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-5">
              <div>
                <h2 className="font-semibold text-neutral-950">Tool timeline</h2>
                <p className="mt-1 text-sm text-neutral-600">Ordered trace events captured during the run.</p>
              </div>
              <Badge tone={run.status === "failed" ? "red" : run.status === "running" ? "amber" : "green"}>{run.status}</Badge>
            </div>
            <div className="p-5">
              {run.events.length ? (
                run.events.map((event) => <TraceTool key={`${event.order}-${event.title}`} event={event} />)
              ) : (
                <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                  No trace events were saved for this run.
                </div>
              )}
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="border-b border-neutral-200 p-5">
              <h2 className="font-semibold text-neutral-950">Real shell terminal</h2>
              <p className="mt-1 text-sm text-neutral-600">Captured command lifecycle, stdout, stderr, and sandbox setup events.</p>
            </div>
            <Terminal className="m-5" output={terminalOutput} />
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Conversation output</h2>
            <div className="mt-4 rounded-md border border-neutral-200 bg-white p-4">
              <SafeMessageResponse>{run.output || "No output saved."}</SafeMessageResponse>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Run metadata</h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <Meta label="Skill" value={run.skillName} />
              <Meta label="Version" value={run.version} />
              <Meta label="Provider" value={run.provider ?? "virtual"} />
              <Meta label="Model" value={run.model ?? "sandbox-model"} />
              {run.sandbox?.executionMode ? <Meta label="Mode" value={run.sandbox.executionMode} /> : null}
              {run.sandbox?.command ? <Meta label="Command" value={run.sandbox.command} /> : null}
              {run.sandbox?.exitCode !== undefined ? <Meta label="Exit code" value={String(run.sandbox.exitCode)} /> : null}
              {run.sandbox?.networkPolicy ? <Meta label="Network" value={run.sandbox.networkPolicy} /> : null}
              {run.replayOf ? <Meta label="Replay of" value={run.replayOf} /> : null}
              <Meta label="Latency" value={`${run.latencyMs}ms`} />
              <Meta label="Estimated cost" value={`$${run.estimatedCost}`} />
            </dl>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Files and artifacts</h2>
            <div className="mt-4">
              {fileRecords.length ? (
                <FileTree className="border-neutral-200 bg-neutral-50" defaultExpanded={defaultExpandedPaths(fileRecords)}>
                  {renderFileTree(fileRecords)}
                </FileTree>
              ) : (
                <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                  No workspace files or artifacts were saved for this trace.
                </div>
              )}
            </div>
          </Panel>

          {run.artifacts?.length ? (
            <Panel className="p-5">
              <h2 className="font-semibold text-neutral-950">Artifacts</h2>
              <div className="mt-4 flex flex-col gap-4">
                {run.artifacts.map((artifact) => (
                  <div key={artifact.path} className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs font-semibold text-neutral-950">{artifact.path}</span>
                      <Badge tone={artifact.kind === "created" ? "green" : "blue"}>{artifact.kind}</Badge>
                    </div>
                    <div className="mt-3 max-h-72 overflow-auto rounded-md border border-neutral-200 bg-white p-3">
                      <SafeMessageResponse>{artifact.after}</SafeMessageResponse>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">JSON preview</h2>
            <div className="mt-3">
              <CodeBlock code={JSON.stringify(run, null, 2)} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TraceTool({ event }: { event: SkillTraceEvent }) {
  return (
    <Tool className="mb-3 border-neutral-200 bg-white" defaultOpen={event.status !== "complete" && event.status !== "approved"}>
      <ToolHeader state={eventToolState(event)} title={`${String(event.order).padStart(2, "0")} ${event.title}`} type={eventToolType(event)} />
      <ToolContent>
        <ToolInput
          input={{
            order: event.order,
            type: event.type,
            status: event.status,
            metadata: event.metadata ?? {},
          }}
        />
        <div className="rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
          <SafeMessageResponse>{event.detail}</SafeMessageResponse>
        </div>
      </ToolContent>
    </Tool>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3 last:border-b-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-neutral-950">{value}</dd>
    </div>
  );
}

function collectTraceFiles(workspaceFiles: WorkspaceFile[], artifacts: SandboxArtifact[]) {
  const records = new Map<string, TraceFileRecord>();
  for (const file of workspaceFiles) {
    records.set(file.path, { path: file.path, content: file.content, source: "workspace", size: file.size });
  }
  for (const artifact of artifacts) {
    records.set(artifact.path, { path: artifact.path, content: artifact.after, source: "artifact", size: artifact.after.length });
  }
  return [...records.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function renderFileTree(records: TraceFileRecord[]) {
  const root = buildTree(records);
  return renderTreeNodes([...root.children.values()]);
}

function renderTreeNodes(nodes: TreeNode[]): ReactNode {
  return sortTreeNodes(nodes).map((node) => {
    if (node.file) {
      return <FileTreeFile key={node.path} name={`${node.name} (${node.file.source})`} path={node.path} />;
    }
    return (
      <FileTreeFolder key={node.path} name={node.name} path={node.path}>
        {renderTreeNodes([...node.children.values()])}
      </FileTreeFolder>
    );
  });
}

function buildTree(records: TraceFileRecord[]) {
  const root: TreeNode = { name: "", path: "", children: new Map() };
  for (const record of records) {
    const segments = record.path.split("/").filter(Boolean);
    let current = root;
    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isFile = index === segments.length - 1;
      const existing = current.children.get(segment);
      const next: TreeNode = existing ?? { name: segment, path: currentPath, children: new Map<string, TreeNode>() };
      if (isFile) next.file = record;
      current.children.set(segment, next);
      current = next;
    });
  }
  return root;
}

function sortTreeNodes(nodes: TreeNode[]) {
  return nodes.sort((a, b) => {
    if (Boolean(a.file) !== Boolean(b.file)) return a.file ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

function defaultExpandedPaths(records: TraceFileRecord[]) {
  const paths = new Set<string>();
  for (const file of records) {
    const segments = file.path.split("/").filter(Boolean);
    let current = "";
    for (const segment of segments.slice(0, -1)) {
      current = current ? `${current}/${segment}` : segment;
      paths.add(current);
    }
  }
  return paths;
}

function eventToolState(event: SkillTraceEvent): ToolPart["state"] {
  if (event.status === "blocked") return "output-denied";
  if (event.status === "failed") return "output-error";
  if (event.status === "running") return "input-available";
  return "output-available";
}

function eventToolType(event: SkillTraceEvent) {
  return `tool-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "event"}` as `tool-${string}`;
}

function buildTraceTerminalOutput(run: SkillRun) {
  const lines = [];
  if (run.sandbox?.command) lines.push(`$ ${run.sandbox.command}`);
  for (const event of run.events) {
    if (
      event.type === "tool" ||
      event.type === "error" ||
      event.title.toLowerCase().includes("sandbox") ||
      event.title.toLowerCase().includes("command") ||
      event.title.toLowerCase().includes("shell")
    ) {
      lines.push(`[${event.status}] ${event.title}: ${event.detail}`);
    }
  }
  if (run.sandbox?.exitCode !== undefined) lines.push(`exit code: ${run.sandbox.exitCode}`);
  return lines.join("\n") || "No terminal output was captured for this run.";
}
