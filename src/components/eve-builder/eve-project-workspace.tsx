"use client";

import { Database, Download, FileCode2, FolderPlus, History, RefreshCw, Save, Trash2 } from "lucide-react";
import type { AgentProject } from "@/lib/eve/agent-project";

export type EveProjectSummary = { id: string; name: string; status: string; updatedAt: string };
export type EveBuildEvent = { id: string; type: string; status: string; title: string; detail?: string | null; createdAt: string };
export type EveBuildRun = { id: string; status: string; model: string; prompt: string; error?: string | null; createdAt: string; events: EveBuildEvent[] };

type Props = {
  projects: EveProjectSummary[];
  projectId: string;
  project: AgentProject;
  status: string;
  updatedAt: string;
  runs: EveBuildRun[];
  selectedFile: string;
  saveState: "saved" | "saving" | "unsaved" | "error";
  workspaceError: string;
  busy: boolean;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onReload: () => void;
  onSave: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onReset: () => void;
  onSelectFile: (path: string) => void;
  onEditFile: (content: string) => void;
};

export function EveProjectWorkspace(props: Props) {
  const files = [...props.project.files].sort((a, b) => a.path.localeCompare(b.path));
  const activeFile = files.find((file) => file.path === props.selectedFile) ?? files[0];
  const savedLabel = props.saveState === "saving" ? "Saving…" : props.saveState === "unsaved" ? "Unsaved changes" : props.saveState === "error" ? "Save failed" : "Saved to Neon";

  return (
    <aside className="eve-project-workspace">
      <header className="eve-workspace-header">
        <div>
          <div className="eve-eyebrow">Project workspace</div>
          <h2>{props.project.metadata.displayName}</h2>
          <p><Database className="size-3.5" /> {titleCase(props.status)} · {savedLabel}</p>
        </div>
        <button className="builder-secondary-button" type="button" onClick={props.onNewProject} disabled={props.busy}>
          <FolderPlus className="size-4" /> New project
        </button>
      </header>

      <div className="eve-project-controls">
        <label>
          <span>Current project</span>
          <select className="builder-input" value={props.projectId} onChange={(event) => props.onSelectProject(event.target.value)} disabled={props.busy || !props.projects.length}>
            {!props.projects.length ? <option value="">No saved projects</option> : null}
            {props.projects.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}
          </select>
        </label>
        <div className="eve-workspace-actions">
          <button className="builder-secondary-button" type="button" onClick={props.onReload} disabled={!props.projectId || props.busy}><RefreshCw className="size-4" /> Reload</button>
          <button className="builder-secondary-button" type="button" onClick={props.onSave} disabled={!props.projectId || props.busy || props.saveState === "saving"}><Save className="size-4" /> Save</button>
          <button className="builder-secondary-button" type="button" onClick={props.onDownload} disabled={!props.project.files.length}><Download className="size-4" /> ZIP</button>
        </div>
      </div>

      {props.workspaceError ? <div className="eve-workspace-error">{props.workspaceError}</div> : null}

      <section className="eve-workspace-files">
        <div className="eve-workspace-section-title"><FileCode2 className="size-4" /><strong>Files</strong><span>{files.length}</span></div>
        <div className="eve-file-browser">
          <nav aria-label="Project files">
            {files.length ? files.map((file) => (
              <button key={file.path} type="button" className={activeFile?.path === file.path ? "active" : ""} onClick={() => props.onSelectFile(file.path)}>
                <FileCode2 className="size-3.5" /><span>{file.path}</span>
              </button>
            )) : <p>No files yet. Describe the agent in chat to generate them.</p>}
          </nav>
          <div className="eve-file-editor">
            <div><strong>{activeFile?.path ?? "No file selected"}</strong><span>{activeFile?.generated === false ? "Edited" : "Generated"}</span></div>
            <textarea value={activeFile?.content ?? ""} onChange={(event) => props.onEditFile(event.target.value)} disabled={!activeFile || props.busy} spellCheck={false} aria-label="Project file content" />
          </div>
        </div>
      </section>

      <section className="eve-build-history">
        <div className="eve-workspace-section-title"><History className="size-4" /><strong>Build history</strong><span>{props.runs.length}</span></div>
        <div className="eve-run-list">
          {props.runs.length ? props.runs.slice(0, 8).map((run) => (
            <details key={run.id}>
              <summary><span className={`eve-run-status ${run.status}`}>{run.status}</span><strong>{truncate(run.prompt, 56)}</strong><time>{formatDate(run.createdAt)}</time></summary>
              <div>
                {run.error ? <p className="eve-run-error">{run.error}</p> : null}
                {run.events.map((event) => <p key={event.id}><span>{event.title}</span>{event.detail ? <small>{event.detail}</small> : null}</p>)}
              </div>
            </details>
          )) : <p className="eve-empty-state">No build runs yet.</p>}
        </div>
      </section>

      <footer className="eve-workspace-footer">
        <span>{props.updatedAt ? `Updated ${formatDate(props.updatedAt)}` : "Not saved yet"}</span>
        <div>
          <button type="button" className="builder-secondary-button" onClick={props.onReset} disabled={!props.projectId || props.busy}>Reset files</button>
          <button type="button" className="builder-secondary-button eve-danger-button" onClick={props.onDelete} disabled={!props.projectId || props.busy}><Trash2 className="size-4" /> Delete</button>
        </div>
      </footer>
    </aside>
  );
}

function titleCase(value: string) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Draft"; }
function truncate(value: string, length: number) { return value.length > length ? `${value.slice(0, length - 1)}…` : value; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
