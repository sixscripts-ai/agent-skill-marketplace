import {
  createDefaultAgentProject,
  mergeArchitectProject,
  type AgentProject,
  type AgentProjectFile,
} from "./agent-project";

export type WorkspaceAgentProject = AgentProject & { fileMode?: "managed" | "explicit" };

export function createBlankAgentProject(): WorkspaceAgentProject {
  const base = createDefaultAgentProject();
  return {
    ...base,
    metadata: { displayName: "New Agent", directoryName: "new-agent", description: "Describe the agent in chat and Eve will build its project.", template: "custom" },
    brief: { purpose: "Complete the requested workflow safely and accurately.", users: "Operators", inputs: "User instructions", outputs: "Structured results", successCriteria: "The requested outcome is completed and verified.", constraints: "Do not invent facts or expose secrets.", approvals: "Ask before sensitive external actions." },
    tools: [],
    skills: [],
    environment: [],
    files: [],
    tests: [],
    changes: [],
    fileMode: "explicit",
  };
}

export function normalizeWorkspaceProject(project: AgentProject | WorkspaceAgentProject): WorkspaceAgentProject {
  if (!isExplicitProject(project)) return project as WorkspaceAgentProject;
  return {
    ...project,
    fileMode: "explicit",
    tools: Array.isArray(project.tools) ? project.tools : [],
    skills: Array.isArray(project.skills) ? project.skills : [],
    environment: Array.isArray(project.environment) ? project.environment : [],
    permissions: Array.isArray(project.permissions) ? project.permissions : [],
    files: uniqueFiles(Array.isArray(project.files) ? project.files : []),
    tests: Array.isArray(project.tests) ? project.tests : [],
    changes: Array.isArray(project.changes) ? project.changes : [],
  };
}

export function mergeWorkspaceProject(current: WorkspaceAgentProject, update: Partial<AgentProject>): WorkspaceAgentProject {
  if (!isExplicitProject(current)) return mergeArchitectProject(current, update) as WorkspaceAgentProject;
  return normalizeWorkspaceProject({
    ...current,
    ...update,
    fileMode: "explicit",
    metadata: { ...current.metadata, ...(isObject(update.metadata) ? update.metadata : {}) },
    brief: { ...current.brief, ...(isObject(update.brief) ? update.brief : {}) },
    runtime: { ...current.runtime, ...(isObject(update.runtime) ? update.runtime : {}) },
    tools: Array.isArray(update.tools) ? update.tools.filter(isString) : current.tools,
    skills: Array.isArray(update.skills) ? update.skills : current.skills,
    permissions: Array.isArray(update.permissions) ? update.permissions : current.permissions,
    tests: Array.isArray(update.tests) ? update.tests : current.tests,
    files: Array.isArray(update.files) ? mergeFiles(current.files, update.files) : current.files,
  } as WorkspaceAgentProject);
}

export function isExplicitProject(project: AgentProject | WorkspaceAgentProject) {
  return (project as WorkspaceAgentProject).fileMode === "explicit";
}

export async function downloadWorkspaceProject(project: WorkspaceAgentProject) {
  if (!isExplicitProject(project)) {
    const { downloadAgentProject } = await import("./agent-project");
    return downloadAgentProject(project);
  }
  const { default: JSZip } = await import("jszip");
  const { saveAs } = await import("file-saver");
  const zip = new JSZip();
  const root = zip.folder(project.metadata.directoryName || "agent");
  if (!root) throw new Error("Failed to create agent package.");
  for (const file of uniqueFiles(project.files)) root.file(file.path, file.content);
  root.file("agent.manifest.json", JSON.stringify({
    metadata: project.metadata,
    runtime: project.runtime,
    runtimeModel: project.runtimeModel,
    tools: project.tools,
    skills: project.skills,
    environment: project.environment.map(({ configured, ...item }) => item),
    permissions: project.permissions,
    tests: project.tests.map(({ output, status, ...item }) => item),
  }, null, 2));
  saveAs(await zip.generateAsync({ type: "blob" }), `${project.metadata.directoryName || "agent"}-eve-agent.zip`);
}

function mergeFiles(current: AgentProjectFile[], incoming: AgentProjectFile[]) {
  const files = new Map(uniqueFiles(current).map((file) => [file.path, file]));
  for (const file of uniqueFiles(incoming)) files.set(file.path, { ...file, generated: file.generated ?? false });
  return [...files.values()];
}

function uniqueFiles(files: AgentProjectFile[]) {
  const byPath = new Map<string, AgentProjectFile>();
  for (const file of files) {
    const path = typeof file?.path === "string" ? file.path.trim() : "";
    if (!path) continue;
    byPath.set(path, { path, content: typeof file.content === "string" ? file.content : "", generated: file.generated });
  }
  return [...byPath.values()];
}

function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === "string" && Boolean(value.trim()); }
