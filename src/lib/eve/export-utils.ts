import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getAgentTs, DEFAULT_INSTRUCTIONS_MD, AVAILABLE_TOOLS } from './eve-templates';

export interface AgentState {
  agentName: string;
  model: string;
  instructions: string;
  selectedTools: string[]; // array of tool ids
}

export const generateEveZip = async (state: AgentState) => {
  const zip = new JSZip();
  const agentFolder = zip.folder(state.agentName || 'agent');

  if (!agentFolder) {
    throw new Error('Failed to create zip folder');
  }

  const useFirecrawlMcp = state.selectedTools.includes('firecrawl_mcp');

  // Add agent.ts
  const agentTsContent = getAgentTs(state.agentName || 'agent', state.model || 'anthropic/claude-3-5-sonnet-20240620', useFirecrawlMcp);
  agentFolder.file('agent.ts', agentTsContent);

  // Add instructions.md
  agentFolder.file('instructions.md', state.instructions || DEFAULT_INSTRUCTIONS_MD);

  // Add tools/ directory
  const toolsFolder = agentFolder.folder('tools');
  const skillsFolder = agentFolder.folder('skills');

  if (toolsFolder) {
    state.selectedTools.forEach(toolId => {
      const toolDef = AVAILABLE_TOOLS.find(t => t.id === toolId);
      // MCP tools like firecrawl_mcp don't have a .ts file, they are injected in agent.ts
      if (toolDef && !toolDef.isMcp && toolDef.code) {
        toolsFolder.file(`${toolId}.ts`, toolDef.code);
      }
    });
    // Add a placeholder to keep the directory if empty
    toolsFolder.file('.gitkeep', '');
  }

  if (skillsFolder) {
    // Add a placeholder to keep the directory
    skillsFolder.file('.gitkeep', '');
  }

  // Generate zip file and download
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${state.agentName || 'agent'}-eve-agent.zip`);
};
