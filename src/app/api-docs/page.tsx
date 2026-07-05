import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import { ActionGuide } from "@/components/feature-walkthrough";
import { Badge, Panel } from "@/components/ui";

export const metadata: Metadata = {
  title: "API Reference | Agent Skill Marketplace",
  description: "Reference for the Agent Skill Marketplace routes used by skills, runs, traces, evals, uploads, and packages.",
};

const endpoints = [
  ["GET", "/api/health/ui", "Read non-secret UI readiness for database, shell sandbox, and seed data."],
  ["POST", "/api/skills/import", "Parse SKILL.md text or an uploaded package and return validation suggestions."],
  ["POST", "/api/skills/upload", "Upload .md, .skill, .zip, or folder package files for parsing and storage."],
  ["POST", "/api/skills", "Publish a skill and version from Builder. Requires authentication."],
  ["POST", "/api/runs/stream", "Start a streamed sandbox run and persist trace events."],
  ["GET", "/api/traces/[runId]", "Export a persisted trace as JSON for an owned or allowed run."],
  ["POST", "/api/evals/[skillSlug]/run", "Save and run eval cases for a skill version."],
  ["GET", "/api/packages/[skillId]", "Download an installable skill package zip."],
  ["GET", "/api/cli", "Download the portable CLI package."],
];

export default function ApiDocsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">API Reference</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            The app uses these routes for uploads, parsing, publishing, streamed runs, traces, evals, packages, and CLI downloads.
          </p>
        </div>

        <ActionGuide
          steps={[
            { label: "1", title: "Check health", body: "Use /api/health/ui first to confirm production readiness labels." },
            { label: "2", title: "Import", body: "Parse SKILL.md before publish so formatting issues are visible." },
            { label: "3", title: "Run", body: "Use the SSE run route for live sandbox events and persisted traces." },
            { label: "4", title: "Export", body: "Download traces, workspaces, packages, or the CLI after the run completes." },
          ]}
        />

        <Panel className="overflow-hidden">
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="font-semibold text-neutral-950">Routes</h2>
          </div>
          <div className="divide-y divide-neutral-200">
            {endpoints.map(([method, path, description]) => (
              <div key={path} className="grid gap-3 px-5 py-4 md:grid-cols-[90px_1fr_2fr]">
                <Badge tone={method === "GET" ? "blue" : "amber"}>{method}</Badge>
                <code className="font-mono text-sm text-neutral-950">{path}</code>
                <p className="text-sm leading-6 text-neutral-600">{description}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-semibold text-neutral-950">Example</h2>
          <div className="mt-4">
            <CodeBlock
              code={`fetch("/api/skills/import", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ skillMd })
}).then((response) => response.json())`}
            />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
