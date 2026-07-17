import JSZip from "jszip";
import { saveAs } from "file-saver";
import { createDefaultEveProject, synchronizeEveProject, type EveAgentProject } from "./agent-project";

export interface AgentState {
  agentName: string;
  model: string;
  instructions: string;
  selectedTools: string[];
}

export async function downloadEveProject(project: EveAgentProject) {
  const synchronized = synchronizeEveProject(project, true);
  const zip = new JSZip();
  const root = zip.folder(synchronized.directoryName);
  if (!root) throw new Error("Failed to create the Eve project archive.");

  for (const [path, content] of Object.entries(synchronized.files).sort(([a], [b]) => a.localeCompare(b))) {
    root.file(path, content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${synchronized.directoryName}-eve-agent.zip`);
}

export async function generateEveZip(state: AgentState | EveAgentProject) {
  if ("directoryName" in state) return downloadEveProject(state);
  const base = createDefaultEveProject();
  return downloadEveProject(
    synchronizeEveProject(
      {
        ...base,
        displayName: state.agentName.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
        directoryName: state.agentName,
        model: state.model,
        instructions: state.instructions,
        selectedTools: state.selectedTools,
      },
      false,
    ),
  );
}
