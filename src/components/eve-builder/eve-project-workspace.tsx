"use client";

import { Database, Download, FileCode2, FolderPlus, History, PanelLeftClose, RefreshCw, Save, Trash2 } from "lucide-react";
import type { AgentProject } from "@/lib/eve/agent-project";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type EveProjectSummary = { id: string; name: string; status: string; updatedAt: string };
export type EveBuildEvent = {
  id: string;
  type: string;
  status: string;
  title: string;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};
export type EveBuildRun = {
  id: string;
  status: string;
  model: string;
  prompt: string;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  events: EveBuildEvent[];
};

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
  onCollapse?: () => void;
};

export function EveProjectWorkspace(props: Props) {
  const files = [...props.project.files].sort((a, b) => a.path.localeCompare(b.path));
  const activeFile = files.find((file) => file.path === props.selectedFile) ?? files[0];
  const saveChip = saveChipLabel(props.saveState);
  const statusChip = titleCase(props.status);

  return (
    <aside className="eve-project-workspace" id="eve-project-workspace-panel" aria-label="Project workspace">
      <header className="eve-workspace-header">
        <div className="eve-workspace-title-block">
          <div className="eve-eyebrow">Project workspace</div>
          <h2 className="eve-workspace-title" title={props.project.metadata.displayName}>
            {props.project.metadata.displayName}
          </h2>
          <div className="eve-workspace-status-row" aria-live="polite">
            <span className={`eve-status-chip eve-status-${props.status}`}>
              <Database className="size-3" aria-hidden="true" />
              {statusChip}
            </span>
            <span className={`eve-save-chip eve-save-${props.saveState}`}>{saveChip}</span>
          </div>
        </div>
        {props.onCollapse ? (
          <button
            type="button"
            className="builder-secondary-button eve-collapse-button"
            onClick={props.onCollapse}
            aria-expanded={true}
            aria-controls="eve-project-workspace-panel"
            aria-label="Hide project workspace"
          >
            <PanelLeftClose className="size-4" aria-hidden="true" />
            Hide
          </button>
        ) : null}
      </header>

      <div className="eve-workspace-toolbar">
        <label className="eve-workspace-project-select">
          <span>Current project</span>
          <select
            className="builder-input"
            value={props.projectId}
            onChange={(event) => props.onSelectProject(event.target.value)}
            disabled={props.busy || !props.projects.length}
          >
            {!props.projects.length ? <option value="">No saved projects</option> : null}
            {props.projects.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.status}</option>
            ))}
          </select>
        </label>
        <button
          className="builder-secondary-button"
          type="button"
          onClick={props.onNewProject}
          disabled={props.busy}
        >
          <FolderPlus className="size-4" aria-hidden="true" />
          New project
        </button>
      </div>

      <div className="eve-workspace-action-groups" role="group" aria-label="Project actions">
        <div className="eve-action-group eve-action-primary">
          <button className="builder-secondary-button" type="button" onClick={props.onSave} disabled={!props.projectId || props.busy || props.saveState === "saving"}>
            <Save className="size-4" aria-hidden="true" /> Save
          </button>
          <button className="builder-secondary-button" type="button" onClick={props.onReload} disabled={!props.projectId || props.busy}>
            <RefreshCw className="size-4" aria-hidden="true" /> Reload
          </button>
          <button className="builder-secondary-button" type="button" onClick={props.onDownload} disabled={!props.project.files.length}>
            <Download className="size-4" aria-hidden="true" /> ZIP
          </button>
        </div>
        <div className="eve-action-group eve-action-secondary">
          <button type="button" className="builder-secondary-button" onClick={props.onReset} disabled={!props.projectId || props.busy}>
            Reset files
          </button>
        </div>
        <div className="eve-action-group eve-action-danger">
          <button type="button" className="builder-secondary-button eve-danger-button" onClick={props.onDelete} disabled={!props.projectId || props.busy}>
            <Trash2 className="size-4" aria-hidden="true" /> Delete
          </button>
        </div>
      </div>

      {props.workspaceError ? <div className="eve-workspace-error" role="alert">{props.workspaceError}</div> : null}

      <Tabs defaultValue="files" className="eve-workspace-tabs">
        <TabsList className="eve-workspace-tabs-list" aria-label="Workspace views">
          <TabsTrigger value="files" className="eve-workspace-tab">
            <FileCode2 className="size-3.5" aria-hidden="true" />
            Files
            <span className="eve-tab-count">{files.length}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="eve-workspace-tab">
            <History className="size-3.5" aria-hidden="true" />
            Build History
            <span className="eve-tab-count">{props.runs.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="eve-workspace-tab-panel">
          <div className="eve-file-browser">
            <nav aria-label="Project files">
              {files.length ? files.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  className={activeFile?.path === file.path ? "active" : ""}
                  onClick={() => props.onSelectFile(file.path)}
                >
                  <FileCode2 className="size-3.5" aria-hidden="true" />
                  <span>{file.path}</span>
                </button>
              )) : (
                <div className="eve-empty-state">
                  <p>No files yet.</p>
                  <p>Describe an agent in chat, then press Build with Eve.</p>
                </div>
              )}
            </nav>
            <div className="eve-file-editor">
              <div>
                <strong>{activeFile?.path ?? "No file selected"}</strong>
                <span>{activeFile ? (activeFile.generated === false ? "Edited" : "Generated") : "—"}</span>
              </div>
              <textarea
                value={activeFile?.content ?? ""}
                onChange={(event) => props.onEditFile(event.target.value)}
                disabled={!activeFile || props.busy}
                spellCheck={false}
                aria-label="Project file content"
                placeholder={files.length ? undefined : "Generated files will open here for editing."}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="eve-workspace-tab-panel">
          <div className="eve-run-list">
            {props.runs.length ? props.runs.slice(0, 8).map((run) => {
              const meta = collectRunMeta(run);
              return (
                <details key={run.id}>
                  <summary>
                    <span className={`eve-run-status ${run.status}`}>{run.status}</span>
                    <strong>{truncate(run.prompt, 56)}</strong>
                    <time dateTime={run.completedAt || run.startedAt || run.createdAt}>
                      {formatDate(run.completedAt || run.startedAt || run.createdAt)}
                    </time>
                  </summary>
                  <div className="eve-run-detail">
                    <p><span>Model</span><small>{run.model}</small></p>
                    <p><span>Started</span><small>{formatDate(run.startedAt || run.createdAt) || "—"}</small></p>
                    <p><span>Completed</span><small>{formatDate(run.completedAt) || "—"}</small></p>
                    {run.error ? <p className="eve-run-error" role="alert">{run.error}</p> : null}
                    {meta.plan.length ? <div className="eve-run-meta-block"><strong>Plan</strong><ul>{meta.plan.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                    {meta.files.length ? <div className="eve-run-meta-block"><strong>Files</strong><small>{meta.files.join(", ")}</small></div> : null}
                    {meta.skills.length ? <div className="eve-run-meta-block"><strong>Skills</strong><small>{meta.skills.join(", ")}</small></div> : null}
                    {meta.requestIds.length ? <div className="eve-run-meta-block"><strong>References</strong><small>{meta.requestIds.join(", ")}</small></div> : null}
                    <div className="eve-run-events">
                      <strong>Events</strong>
                      {run.events.map((event) => {
                        const eventMeta = event.metadata ?? {};
                        const requestId = typeof eventMeta.requestId === "string" ? eventMeta.requestId : null;
                        return (
                          <p key={event.id}>
                            <span>{event.title} · {event.type}</span>
                            {event.detail ? <small>{event.detail}</small> : null}
                            {requestId ? <small>Reference: {requestId}</small> : null}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </details>
              );
            }) : (
              <div className="eve-empty-state">
                <p>No build runs yet.</p>
                <p>Run Build with Eve to start a project and see history here.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <footer className="eve-workspace-footer">
        <span>{props.updatedAt ? `Updated ${formatDate(props.updatedAt)}` : "Not saved yet"}</span>
      </footer>
    </aside>
  );
}

function saveChipLabel(saveState: Props["saveState"]) {
  if (saveState === "saving") return "Saving";
  if (saveState === "unsaved") return "Unsaved";
  if (saveState === "error") return "Save failed";
  return "Saved";
}

function collectRunMeta(run: EveBuildRun) {
  const plan = new Set<string>();
  const files = new Set<string>();
  const skills = new Set<string>();
  const requestIds = new Set<string>();
  for (const event of run.events) {
    const meta = event.metadata ?? {};
    if (Array.isArray(meta.plan)) for (const item of meta.plan) if (typeof item === "string") plan.add(item);
    if (Array.isArray(meta.files)) for (const item of meta.files) if (typeof item === "string") files.add(item);
    if (Array.isArray(meta.skills)) for (const item of meta.skills) if (typeof item === "string") skills.add(item);
    if (typeof meta.requestId === "string") requestIds.add(meta.requestId);
  }
  return {
    plan: [...plan],
    files: [...files],
    skills: [...skills],
    requestIds: [...requestIds],
  };
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Draft";
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
