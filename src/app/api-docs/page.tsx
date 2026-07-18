import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import { ActionGuide } from "@/components/feature-walkthrough";
import {
  FirebenchHeroCard,
  FirebenchHeroIntro,
  FirebenchPage,
  FirebenchTag,
} from "@/components/firebench";

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
] as const;

export default function ApiDocsPage() {
  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <FirebenchPage heat="bold" canvas>
        <FirebenchHeroIntro
          kicker="// API //"
          title="Routes for"
          accent="agents"
          lead="Upload, parse, publish, stream runs, export traces, evals, packages, and the CLI — one heat-consistent reference."
        />

        <div className="fb-tags">
          <FirebenchTag>[ GET ]</FirebenchTag>
          <FirebenchTag>[ POST ]</FirebenchTag>
          <FirebenchTag>[ SSE ]</FirebenchTag>
        </div>

        <FirebenchHeroCard
          actionsLeft={<FirebenchTag>[ FLOW ]</FirebenchTag>}
          actionsRight={
            <Link href="/cli" className="fb-cta fb-cta--primary">
              Get CLI
            </Link>
          }
        >
          <ActionGuide
            steps={[
              { label: "1", title: "Check health", body: "Use /api/health/ui first to confirm production readiness labels." },
              { label: "2", title: "Import", body: "Parse SKILL.md before publish so formatting issues are visible." },
              { label: "3", title: "Run", body: "Use the SSE run route for live sandbox events and persisted traces." },
              { label: "4", title: "Export", body: "Download traces, workspaces, packages, or the CLI after the run completes." },
            ]}
          />
        </FirebenchHeroCard>

        <div className="fb-list" aria-label="API routes">
          {endpoints.map(([method, path, description]) => (
            <article key={path} className="fb-row">
              <div>
                <h3 className="fb-row__name">{path}</h3>
                <div className="fb-row__meta">
                  <FirebenchTag>{`[ ${method} ]`}</FirebenchTag>
                </div>
              </div>
              <p className="fb-row__desc">{description}</p>
              <div />
            </article>
          ))}
        </div>

        <div className="fb-stage">
          <div className="fb-stage__label">
            <h2 className="fb-section-title" style={{ fontSize: "1rem" }}>
              Example
            </h2>
            <FirebenchTag>[ FETCH ]</FirebenchTag>
          </div>
          <div className="fb-stage__body">
            <CodeBlock
              code={`fetch("/api/skills/import", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ skillMd })
}).then((response) => response.json())`}
            />
          </div>
        </div>
      </FirebenchPage>
    </AppShell>
  );
}
