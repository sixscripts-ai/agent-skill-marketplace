"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentProject } from "@/lib/eve/agent-project";
import {
  createBlankAgentProject,
  downloadWorkspaceProject,
  normalizeWorkspaceProject,
  type WorkspaceAgentProject,
} from "@/lib/eve/workspace-project";
import {
  EveProjectWorkspace,
  type EveBuildRun,
  type EveProjectSummary,
} from "./eve-project-workspace";

type StoredProject = {
  id: string;
  project: WorkspaceAgentProject;
  runs?: EveBuildRun[];
  updatedAt?: string;
  status?: string;
};

export function EveProjectWorkspaceClient() {
  const [projects, setProjects] = useState<EveProjectSummary[]>([]);
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<WorkspaceAgentProject>(() => createBlankAgentProject());
  const [runs, setRuns] = useState<EveBuildRun[]>([]);
  const [status, setStatus] = useState("draft");
  const [updatedAt, setUpdatedAt] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [workspaceError, setWorkspaceError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadProject = useCallback(async (id: string) => {
    const stored = await api<StoredProject>(`/api/eve/projects?id=${encodeURIComponent(id)}`);
    const next = normalizeWorkspaceProject(stored.project);
    setProjectId(stored.id);
    setProject(next);
    setRuns(stored.runs ?? []);
    setStatus(stored.status ?? "draft");
    setUpdatedAt(stored.updatedAt ?? "");
    setSelectedFile((current) => next.files.some((file) => file.path === current) ? current : next.files[0]?.path ?? "");
    setSaveState("saved");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await api<EveProjectSummary[]>("/api/eve/projects");
      setProjects(list);
      const target = projectId && list.some((item) => item.id === projectId) ? projectId : list[0]?.id;
      if (target) await loadProject(target);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
    }
  }, [loadProject, projectId]);

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!busy && saveState === "saved") void refresh(); }, 5000);
    return () => window.clearInterval(timer);
  }, [busy, refresh, saveState]);

  async function save(next = project) {
    if (!projectId) return;
    setSaveState("saving");
    setWorkspaceError("");
    try {
      const stored = await api<StoredProject>("/api/eve/projects", {
        method: "PATCH",
        body: JSON.stringify({ projectId, project: next }),
      });
      const normalized = normalizeWorkspaceProject(stored.project);
      setProject(normalized);
      setRuns(stored.runs ?? []);
      setUpdatedAt(stored.updatedAt ?? "");
      setStatus(stored.status ?? "draft");
      setSaveState("saved");
      await refreshList();
    } catch (error) {
      setSaveState("error");
      setWorkspaceError(error instanceof Error ? error.message : String(error));
    }
  }

  async function refreshList() {
    const list = await api<EveProjectSummary[]>("/api/eve/projects");
    setProjects(list);
  }

  async function createProject() {
    setBusy(true);
    setWorkspaceError("");
    try {
      const stored = await api<StoredProject>("/api/eve/projects", {
        method: "POST",
        body: JSON.stringify({ project: createBlankAgentProject() }),
      });
      setProjectId(stored.id);
      window.location.reload();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  async function selectProject(id: string) {
    if (!id || id === projectId) return;
    setBusy(true);
    setWorkspaceError("");
    try {
      const stored = await api<StoredProject>(`/api/eve/projects?id=${encodeURIComponent(id)}`);
      await api("/api/eve/projects", { method: "PATCH", body: JSON.stringify({ projectId: id, project: stored.project }) });
      window.location.reload();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  async function deleteProject() {
    if (!projectId || !window.confirm(`Delete ${project.metadata.displayName}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/eve/projects?id=${encodeURIComponent(projectId)}`, { method: "DELETE" });
      window.location.reload();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  function editFile(content: string) {
    if (!selectedFile) return;
    setProject((current) => ({
      ...current,
      files: current.files.map((file) => file.path === selectedFile ? { ...file, content, generated: false } : file),
    }));
    setSaveState("unsaved");
  }

  async function resetFiles() {
    if (!window.confirm("Remove every project file and start the file workspace clean?")) return;
    const next = normalizeWorkspaceProject({ ...project, fileMode: "explicit", files: [] } as WorkspaceAgentProject);
    setProject(next);
    setSelectedFile("");
    await save(next);
  }

  return (
    <EveProjectWorkspace
      projects={projects}
      projectId={projectId}
      project={project as AgentProject}
      status={status}
      updatedAt={updatedAt}
      runs={runs}
      selectedFile={selectedFile}
      saveState={saveState}
      workspaceError={workspaceError}
      busy={busy}
      onSelectProject={(id) => void selectProject(id)}
      onNewProject={() => void createProject()}
      onReload={() => void loadProject(projectId)}
      onSave={() => void save()}
      onDownload={() => void downloadWorkspaceProject(project)}
      onDelete={() => void deleteProject()}
      onReset={() => void resetFiles()}
      onSelectFile={setSelectedFile}
      onEditFile={editFile}
    />
  );
}

async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed with ${response.status}.`);
  return data as T;
}
