import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ActionGuide, FeatureWalkthrough } from "@/components/feature-walkthrough";
import { ButtonLink, Panel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Docs | Agent Skill Marketplace",
  description: "Learn how to browse, upload, validate, run, trace, evaluate, and export agent skills.",
};

const sections = [
  ["Marketplace", "Choose a skill, inspect permissions, then run it before installing."],
  ["Builder", "Upload a SKILL.md, .skill file, zip, or folder. Apply suggested fixes before publishing."],
  ["Sandbox", "Run a skill with virtual provider mode or an approved real-shell sandbox command."],
  ["Evals", "Save repeatable tests so each skill version can prove quality over time."],
  ["Traces", "Review the evidence from each run: permissions, tools, terminal output, files, and artifacts."],
  ["Install", "Export packages for Codex, Claude, VS Code, OpenCode, Grok, and Antigravity."],
];

export default function DocsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Docs</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              A plain-English guide to what each feature does and what to click first.
            </p>
          </div>
          <ButtonLink href="/builder">Create a Skill</ButtonLink>
        </div>

        <ActionGuide
          steps={[
            { label: "1", title: "Browse", body: "Find a skill in Marketplace that matches the work you want done." },
            { label: "2", title: "Inspect", body: "Read the README, permissions, compatibility, versions, and eval score." },
            { label: "3", title: "Run", body: "Use Sandbox to test the skill with a safe prompt and real files." },
            { label: "4", title: "Trace", body: "Open the trace to see what the run touched, blocked, and produced." },
            { label: "5", title: "Publish", body: "Use Builder when you want to upload or author your own skill." },
          ]}
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sections.map(([title, body]) => (
            <Panel key={title} className="p-5">
              <h2 className="font-semibold text-neutral-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
            </Panel>
          ))}
        </div>

        <FeatureWalkthrough
          title="What is a skill?"
          description="A skill is a portable instruction package for an AI agent. It explains when to use the skill, what workflow to follow, what permissions are needed, and what examples prove it works."
          example="Upload a folder that contains SKILL.md, README.md, references, scripts, and assets. Builder will parse it and suggest formatting fixes."
          why="Clear skills make agent behavior repeatable. The marketplace adds trust by showing permissions, versions, evals, runs, traces, and install targets."
          items={[
            { title: "SKILL.md", body: "The instruction file that tells the agent how to do a focused job." },
            { title: "Permissions", body: "The safety gates that say what the skill may read, write, execute, or access." },
            { title: "Runs", body: "A live test of the skill against a prompt and workspace files." },
            { title: "Traces", body: "The record of the run, including events, output, artifacts, and blocked actions." },
          ]}
        />
      </div>
    </AppShell>
  );
}
