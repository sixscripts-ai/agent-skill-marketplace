"use client";

import { useMemo, useState } from "react";
import { Download, PanelLeftOpen, Play, Save, ShieldCheck, Wrench } from "lucide-react";
import { runAgentTest } from "@/lib/eve/agent-project";
import { downloadWorkspaceProject } from "@/lib/eve/workspace-project";
import { EveAiChat } from "./eve-ai-chat";
import { EveProjectWorkspaceClient } from "./eve-project-workspace-client";
import { useEveWorkspace } from "./eve-workspace-context";
import "@/app/builder-guided.css";

type EveChapter = "intent" | "craft" | "agent" | "prove" | "ship";

const chapters: Array<{ id: EveChapter; n: string; title: string; hint: string }> = [
  { id: "intent", n: "01", title: "Intent", hint: "Describe the agent" },
  { id: "craft", n: "02", title: "Craft", hint: "Project files" },
  { id: "agent", n: "03", title: "Agent", hint: "Tools & gates" },
  { id: "prove", n: "04", title: "Prove", hint: "Tests & runs" },
  { id: "ship", n: "05", title: "Ship", hint: "Export & save" },
];

export function EveBuilderLayout() {
  const { project, status, setLocalProject, saveProject, projectId, markUnsaved } = useEveWorkspace();
  const [chapter, setChapter] = useState<EveChapter>("intent");
  const [workspaceTab, setWorkspaceTab] = useState<"files" | "history">("files");

  const toolNames = useMemo(() => (Array.isArray(project.tools) ? project.tools : []), [project.tools]);
  const permissionEntries = useMemo(
    () => (Array.isArray(project.permissions) ? project.permissions : []),
    [project.permissions],
  );

  function openChapter(next: EveChapter) {
    setChapter(next);
    if (next === "craft") setWorkspaceTab("files");
    if (next === "prove") setWorkspaceTab("history");
  }

  function runTest(testId: string) {
    const next = runAgentTest(project, testId);
    setLocalProject(next);
    markUnsaved();
  }

  return (
    <div className="builder-workbench-shell eve-journey-shell">
      <header className="builder-guided-header">
        <div className="min-w-0">
          <div className="builder-eyebrow">Eve journey</div>
          <h1>Build a durable AI agent</h1>
          <p>Each chapter opens a different surface — chat, files, contract, tests, or export.</p>
        </div>
        <div className="builder-model-bar" aria-label="Eve status">
          <span className="builder-api-key-button builder-api-key-active">
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span>{status === "building" ? "Building…" : "Ready"}</span>
          </span>
        </div>
      </header>

      <nav className="builder-journey-film" aria-label="Eve builder journey">
        {chapters.map((item) => (
          <button
            key={item.id}
            type="button"
            className="builder-journey-frame"
            aria-current={chapter === item.id ? "step" : undefined}
            onClick={() => openChapter(item.id)}
          >
            <div className="builder-journey-n">{item.n}</div>
            <b>{item.title}</b>
            <span>{item.hint}</span>
          </button>
        ))}
      </nav>

      <div className="builder-section-rule" role="separator" aria-hidden="true" />

      {chapter === "intent" ? (
        <div className="eve-builder-shell is-workspace-collapsed">
          <div className="eve-builder-chat-column">
            <EveAiChat />
            <div className="builder-flow-actions">
              <span className="builder-step-status">Describe the agent, then continue</span>
              <button type="button" className="builder-primary-button" onClick={() => openChapter("craft")}>
                Continue to Craft
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {chapter === "craft" ? (
        <div className="eve-builder-shell">
          <div className="eve-builder-chat-column">
            <EveAiChat />
          </div>
          <div className="eve-builder-section-rule" role="separator" aria-hidden="true" />
          <EveProjectWorkspaceClient tab={workspaceTab} onTabChange={(value) => setWorkspaceTab(value === "history" ? "history" : "files")} />
          <div className="builder-flow-actions">
            <button type="button" className="builder-secondary-button" onClick={() => openChapter("intent")}>
              Back
            </button>
            <button type="button" className="builder-primary-button" onClick={() => openChapter("agent")}>
              Continue to Agent
            </button>
          </div>
        </div>
      ) : null}

      {chapter === "agent" ? (
        <section className="builder-band" aria-labelledby="eve-agent-title">
          <header className="builder-band-header">
            <div>
              <h3 id="eve-agent-title">Agent contract</h3>
              <p>Tools, permissions, and model for this Eve project. Refine via Intent chat if something is missing.</p>
            </div>
            <button type="button" className="builder-secondary-button" onClick={() => openChapter("intent")}>
              Refine in chat
            </button>
          </header>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wrench className="size-4 text-primary" aria-hidden="true" />
                Tools
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {toolNames.length ? toolNames.map((name) => <li key={name} className="font-mono text-foreground">{name}</li>) : <li>No tools yet — describe needed capabilities in Intent.</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Permissions & gates
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {permissionEntries.length ? (
                  permissionEntries.map((item) => (
                    <li key={item.id}>
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="ml-2 font-mono text-xs uppercase">{item.decision}</span>
                    </li>
                  ))
                ) : (
                  <li>No permission map yet. High-risk tools should stay gated until you approve.</li>
                )}
              </ul>
            </div>
            <div className="rounded-lg border border-border p-4 lg:col-span-2">
              <div className="text-sm font-semibold">Model & brief</div>
              <p className="mt-2 font-mono text-sm text-foreground">{project.runtimeModel || "Not set"}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {project.brief?.purpose?.trim() ? project.brief.purpose : "Ask Eve in Intent to write a clear agent purpose."}
              </p>
              {project.brief?.approvals ? <p className="mt-2 text-sm text-muted-foreground">Approvals: {project.brief.approvals}</p> : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="builder-secondary-button" onClick={() => openChapter("craft")}>
              Back to Craft
            </button>
            <button type="button" className="builder-primary-button" onClick={() => openChapter("prove")}>
              Continue to Prove
            </button>
          </div>
        </section>
      ) : null}

      {chapter === "prove" ? (
        <div className="space-y-4">
          <section className="builder-band" aria-labelledby="eve-prove-title">
            <header className="builder-band-header">
              <div>
                <h3 id="eve-prove-title">Prove the agent</h3>
                <p>Run project tests and inspect build history before export.</p>
              </div>
            </header>
            <div className="space-y-3">
              {(project.tests ?? []).length ? (
                project.tests.map((test) => (
                  <div key={test.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{test.name}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{test.input}</p>
                      <p className="mt-1 font-mono text-xs uppercase text-muted-foreground">{test.status}</p>
                      {test.output ? <p className="mt-2 text-sm text-foreground">{test.output}</p> : null}
                    </div>
                    <button type="button" className="builder-primary-button" onClick={() => runTest(test.id)}>
                      <Play className="size-4" aria-hidden="true" />
                      Run test
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tests yet. Ask Eve in Intent to add evaluation cases.</p>
              )}
            </div>
          </section>
          <EveProjectWorkspaceClient
            tab="history"
            onTabChange={(value) => setWorkspaceTab(value === "history" ? "history" : "files")}
          />
          <div className="builder-flow-actions">
            <button type="button" className="builder-secondary-button" onClick={() => openChapter("agent")}>
              Back
            </button>
            <button type="button" className="builder-primary-button" onClick={() => openChapter("ship")}>
              Continue to Ship
            </button>
          </div>
        </div>
      ) : null}

      {chapter === "ship" ? (
        <section className="builder-band" aria-labelledby="eve-ship-title">
          <header className="builder-band-header">
            <div>
              <h3 id="eve-ship-title">Ship the project</h3>
              <p>Save to your account and download a ZIP of the generated agent files.</p>
            </div>
          </header>
          <div className="builder-finish-list">
            <article className="builder-finish-row">
              <span className="builder-finish-icon" aria-hidden="true"><Save className="size-4" /></span>
              <div className="min-w-0">
                <h4>Save project</h4>
                <p>Persist the current Eve project{projectId ? ` (${projectId})` : ""} to your account.</p>
              </div>
              <div className="builder-finish-action">
                <button type="button" className="builder-secondary-button" onClick={() => void saveProject()} disabled={!projectId}>
                  <Save className="size-4" aria-hidden="true" />
                  Save
                </button>
              </div>
            </article>
            <article className="builder-finish-row">
              <span className="builder-finish-icon" aria-hidden="true"><Download className="size-4" /></span>
              <div className="min-w-0">
                <h4>Download ZIP</h4>
                <p>Export {project.files.length} file{project.files.length === 1 ? "" : "s"} for offline use.</p>
              </div>
              <div className="builder-finish-action">
                <button
                  type="button"
                  className="builder-primary-button"
                  onClick={() => void downloadWorkspaceProject(project)}
                  disabled={!project.files.length}
                >
                  <Download className="size-4" aria-hidden="true" />
                  Download ZIP
                </button>
              </div>
            </article>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="builder-secondary-button" onClick={() => openChapter("prove")}>
              Back to Prove
            </button>
            <button type="button" className="builder-secondary-button" onClick={() => openChapter("craft")}>
              <PanelLeftOpen className="size-4" aria-hidden="true" />
              Open files
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
