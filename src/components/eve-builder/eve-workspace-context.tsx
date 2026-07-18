"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AgentProject } from "@/lib/eve/agent-project";
import { synchronizeAgentProject } from "@/lib/eve/agent-project";
import {
  createBlankAgentProject,
  normalizeWorkspaceProject,
  type WorkspaceAgentProject,
} from "@/lib/eve/workspace-project";
import type { EveBuildRun, EveProjectSummary } from "./eve-project-workspace";

export type EveStoredProject = {
  id: string;
  status?: string;
  project: WorkspaceAgentProject | AgentProject;
  conversation?: { messages?: Array<{ id: string; role: string; content: string; metadata?: Record<string, unknown> }> };
  runs?: EveBuildRun[];
  updatedAt?: string;
};

export type EveSaveState = "saved" | "saving" | "unsaved" | "error";

type EveWorkspaceContextValue = {
  projects: EveProjectSummary[];
  projectId: string;
  project: WorkspaceAgentProject;
  status: string;
  updatedAt: string;
  runs: EveBuildRun[];
  selectedFile: string;
  saveState: EveSaveState;
  workspaceError: string;
  busy: boolean;
  building: boolean;
  setSelectedFile: (path: string) => void;
  setBusy: (value: boolean) => void;
  setBuilding: (value: boolean) => void;
  setWorkspaceError: (value: string) => void;
  setSaveState: (value: EveSaveState) => void;
  setLocalProject: (project: WorkspaceAgentProject | AgentProject | ((current: WorkspaceAgentProject) => WorkspaceAgentProject)) => void;
  markUnsaved: () => void;
  selectProject: (id: string) => Promise<void>;
  createProject: () => Promise<string>;
  refresh: () => Promise<void>;
  reloadProject: () => Promise<void>;
  applyServerProject: (stored: EveStoredProject, options?: { forceFiles?: boolean }) => void;
  saveProject: (next?: WorkspaceAgentProject) => Promise<void>;
  deleteProject: () => Promise<void>;
  ensureProject: (current: AgentProject) => Promise<string>;
};

const EveWorkspaceContext = createContext<EveWorkspaceContextValue | null>(null);

export function EveWorkspaceProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<EveProjectSummary[]>([]);
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<WorkspaceAgentProject>(() => createBlankAgentProject());
  const [status, setStatus] = useState("draft");
  const [updatedAt, setUpdatedAt] = useState("");
  const [runs, setRuns] = useState<EveBuildRun[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [saveState, setSaveState] = useState<EveSaveState>("saved");
  const [workspaceError, setWorkspaceError] = useState("");
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);

  const applyServerProject = useCallback((stored: EveStoredProject, options?: { forceFiles?: boolean }) => {
    setProjectId(stored.id);
    setStatus(stored.status ?? "draft");
    setUpdatedAt(stored.updatedAt ?? "");
    setRuns(stored.runs ?? []);
    setProject((current) => {
      if (saveState === "unsaved" && !options?.forceFiles) {
        // Keep local file edits; still refresh non-file project fields when forced not needed.
        return current;
      }
      const next = normalizeWorkspaceProject(stored.project as WorkspaceAgentProject);
      setSelectedFile((path) => next.files.some((file) => file.path === path) ? path : next.files[0]?.path ?? "");
      return next;
    });
    if (options?.forceFiles || saveState !== "unsaved") setSaveState("saved");
  }, [saveState]);

  const loadProject = useCallback(async (id: string, options?: { forceFiles?: boolean }) => {
    const stored = await api<EveStoredProject>(`/api/eve/projects?id=${encodeURIComponent(id)}`);
    applyServerProject(stored, options);
    return stored;
  }, [applyServerProject]);

  const refresh = useCallback(async () => {
    try {
      const list = await api<EveProjectSummary[]>("/api/eve/projects");
      setProjects(list);
      const target = projectId && list.some((item) => item.id === projectId) ? projectId : list[0]?.id;
      if (target) {
        // During unsaved edits, refresh list + runs/status without clobbering files.
        const stored = await api<EveStoredProject>(`/api/eve/projects?id=${encodeURIComponent(target)}`);
        setProjectId(stored.id);
        setStatus(stored.status ?? "draft");
        setUpdatedAt(stored.updatedAt ?? "");
        setRuns(stored.runs ?? []);
        if (saveState === "saved") {
          const next = normalizeWorkspaceProject(stored.project as WorkspaceAgentProject);
          setProject(next);
          setSelectedFile((path) => next.files.some((file) => file.path === path) ? path : next.files[0]?.path ?? "");
        }
      }
      setWorkspaceError("");
    } catch (error) {
      // Signed-out users stay on the blank draft.
      if (!(error instanceof Error && /unauthorized|sign in|401|403/i.test(error.message))) {
        setWorkspaceError(error instanceof Error ? error.message : String(error));
      }
    }
  }, [projectId, saveState]);

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!busy && !building && saveState === "saved") void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [busy, building, refresh, saveState]);

  const selectProject = useCallback(async (id: string) => {
    if (!id || id === projectId) return;
    setBusy(true);
    setWorkspaceError("");
    try {
      await loadProject(id, { forceFiles: true });
      const list = await api<EveProjectSummary[]>("/api/eve/projects");
      setProjects(list);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [loadProject, projectId]);

  const createProject = useCallback(async () => {
    setBusy(true);
    setWorkspaceError("");
    try {
      const stored = await api<EveStoredProject>("/api/eve/projects", {
        method: "POST",
        body: JSON.stringify({ project: createBlankAgentProject() }),
      });
      applyServerProject(stored, { forceFiles: true });
      const list = await api<EveProjectSummary[]>("/api/eve/projects");
      setProjects(list);
      return stored.id;
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }, [applyServerProject]);

  const ensureProject = useCallback(async (current: AgentProject) => {
    if (projectId) return projectId;
    const stored = await api<EveStoredProject>("/api/eve/projects", {
      method: "POST",
      body: JSON.stringify({ project: current }),
    });
    applyServerProject(stored, { forceFiles: true });
    const list = await api<EveProjectSummary[]>("/api/eve/projects");
    setProjects(list);
    return stored.id;
  }, [applyServerProject, projectId]);

  const saveProject = useCallback(async (next = project) => {
    if (!projectId) return;
    setSaveState("saving");
    setWorkspaceError("");
    try {
      const stored = await api<EveStoredProject>("/api/eve/projects", {
        method: "PATCH",
        body: JSON.stringify({ projectId, project: next }),
      });
      applyServerProject(stored, { forceFiles: true });
      const list = await api<EveProjectSummary[]>("/api/eve/projects");
      setProjects(list);
    } catch (error) {
      setSaveState("error");
      setWorkspaceError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [applyServerProject, project, projectId]);

  const deleteProject = useCallback(async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      await api(`/api/eve/projects?id=${encodeURIComponent(projectId)}`, { method: "DELETE" });
      setProjectId("");
      setProject(createBlankAgentProject());
      setRuns([]);
      setStatus("draft");
      setUpdatedAt("");
      setSelectedFile("");
      setSaveState("saved");
      await refresh();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }, [projectId, refresh]);

  const setLocalProject = useCallback((value: WorkspaceAgentProject | AgentProject | ((current: WorkspaceAgentProject) => WorkspaceAgentProject)) => {
    setProject((current) => {
      const next = typeof value === "function" ? value(current) : value;
      return normalizeWorkspaceProject(synchronizeAgentProject(next as AgentProject) as WorkspaceAgentProject);
    });
  }, []);

  const value = useMemo<EveWorkspaceContextValue>(() => ({
    projects,
    projectId,
    project,
    status,
    updatedAt,
    runs,
    selectedFile,
    saveState,
    workspaceError,
    busy,
    building,
    setSelectedFile,
    setBusy,
    setBuilding,
    setWorkspaceError,
    setSaveState,
    setLocalProject,
    markUnsaved: () => setSaveState("unsaved"),
    selectProject,
    createProject,
    refresh,
    reloadProject: async () => { if (projectId) await loadProject(projectId, { forceFiles: true }); },
    applyServerProject,
    saveProject,
    deleteProject,
    ensureProject,
  }), [
    applyServerProject,
    building,
    busy,
    createProject,
    deleteProject,
    ensureProject,
    loadProject,
    project,
    projectId,
    projects,
    refresh,
    runs,
    saveProject,
    saveState,
    selectedFile,
    selectProject,
    setLocalProject,
    status,
    updatedAt,
    workspaceError,
  ]);

  return <EveWorkspaceContext.Provider value={value}>{children}</EveWorkspaceContext.Provider>;
}

export function useEveWorkspace() {
  const value = useContext(EveWorkspaceContext);
  if (!value) throw new Error("useEveWorkspace must be used within EveWorkspaceProvider.");
  return value;
}

export async function eveApi<T = unknown>(url: string, init?: RequestInit): Promise<T & { requestId?: string }> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({})) as { error?: string; requestId?: string };
  if (!response.ok) {
    const reference = typeof data.requestId === "string" ? ` Reference: ${data.requestId}.` : "";
    const error = new Error(`${typeof data.error === "string" ? data.error : `Request failed with ${response.status}.`}${reference}`) as Error & { requestId?: string };
    error.requestId = typeof data.requestId === "string" ? data.requestId : undefined;
    throw error;
  }
  return data as T & { requestId?: string };
}

async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  return eveApi<T>(url, init);
}
