"use client";

import { downloadWorkspaceProject, normalizeWorkspaceProject, type WorkspaceAgentProject } from "@/lib/eve/workspace-project";
import { EveProjectWorkspace } from "./eve-project-workspace";
import { useEveWorkspace } from "./eve-workspace-context";

export function EveProjectWorkspaceClient() {
  const {
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
    markUnsaved,
    setLocalProject,
    selectProject,
    createProject,
    reloadProject,
    saveProject,
    deleteProject,
  } = useEveWorkspace();

  function editFile(content: string) {
    if (!selectedFile) return;
    setLocalProject((current) => ({
      ...current,
      files: current.files.map((file) => file.path === selectedFile ? { ...file, content, generated: false } : file),
    }));
    markUnsaved();
  }

  async function resetFiles() {
    if (!window.confirm("Remove every project file and start the file workspace clean?")) return;
    const next = normalizeWorkspaceProject({ ...project, fileMode: "explicit", files: [] } as WorkspaceAgentProject);
    setLocalProject(next);
    setSelectedFile("");
    await saveProject(next);
  }

  return (
    <EveProjectWorkspace
      projects={projects}
      projectId={projectId}
      project={project}
      status={status}
      updatedAt={updatedAt}
      runs={runs}
      selectedFile={selectedFile}
      saveState={saveState}
      workspaceError={workspaceError}
      busy={busy || building}
      onSelectProject={(id) => void selectProject(id)}
      onNewProject={() => void createProject()}
      onReload={() => void reloadProject()}
      onSave={() => void saveProject()}
      onDownload={() => void downloadWorkspaceProject(project)}
      onDelete={() => {
        if (!projectId || !window.confirm(`Delete ${project.metadata.displayName}? This cannot be undone.`)) return;
        void deleteProject();
      }}
      onReset={() => void resetFiles()}
      onSelectFile={setSelectedFile}
      onEditFile={editFile}
    />
  );
}
