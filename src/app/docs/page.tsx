import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ActionGuide, FeatureWalkthrough } from "@/components/feature-walkthrough";
import {
  FirebenchHeroCard,
  FirebenchHeroIntro,
  FirebenchPage,
  FirebenchTag,
} from "@/components/firebench";

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
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <FirebenchPage heat="bold" canvas>
        <FirebenchHeroIntro
          kicker="// Docs //"
          title="From browse to"
          accent="trace"
          lead="A plain-English guide to what each feature does and what to click first."
        />

        <div className="fb-tags">
          <FirebenchTag>[ MARKETPLACE ]</FirebenchTag>
          <FirebenchTag>[ BUILDER ]</FirebenchTag>
          <FirebenchTag>[ SANDBOX ]</FirebenchTag>
          <FirebenchTag>[ TRACES ]</FirebenchTag>
        </div>

        <FirebenchHeroCard
          actionsLeft={<FirebenchTag>[ START HERE ]</FirebenchTag>}
          actionsRight={
            <Link href="/builder" className="fb-cta fb-cta--primary">
              Create a Skill
            </Link>
          }
        >
          <ActionGuide
            steps={[
              { label: "1", title: "Browse", body: "Find a skill in Marketplace that matches the work you want done." },
              { label: "2", title: "Inspect", body: "Read the README, permissions, compatibility, versions, and eval score." },
              { label: "3", title: "Run", body: "Use Sandbox to test the skill with a safe prompt and real files." },
              { label: "4", title: "Trace", body: "Open the trace to see what the run touched, blocked, and produced." },
              { label: "5", title: "Publish", body: "Use Builder when you want to upload or author your own skill." },
            ]}
          />
        </FirebenchHeroCard>

        <div className="fb-card-grid">
          {sections.map(([title, body]) => (
            <article key={title} className="fb-card">
              <FirebenchTag>{title}</FirebenchTag>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <div className="fb-stage">
          <div className="fb-stage__label">
            <h2 className="fb-section-title" style={{ fontSize: "1rem" }}>
              What is a skill?
            </h2>
            <FirebenchTag>[ CORE ]</FirebenchTag>
          </div>
          <div className="fb-stage__body">
            <FeatureWalkthrough
              title="Portable agent packages"
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
        </div>
      </FirebenchPage>
    </AppShell>
  );
}
