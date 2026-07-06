export const DEFAULT_INSTRUCTIONS_MD = `# Identity
You are an autonomous AI Agent built on the Eve framework.
You follow a filesystem-first architecture, meaning your brain, memory, and tools are natively integrated with the directory you live in.

# Goals
1. Execute tasks autonomously.
2. Use your tools to gather information, manipulate the filesystem, or interact with the outside world.
3. Think step-by-step and verify your work.

# Tools
You have access to tools defined in the \`tools/\` directory.
If the Firecrawl MCP is enabled, you also have access to web scraping and searching tools.
`;

export const getAgentTs = (agentName: string, model: string, useFirecrawlMcp: boolean) => `import { createAgent } from 'eve-framework';

const app = createAgent({
  name: '${agentName}',
  model: '${model}',
  instructions: './instructions.md',
  toolsDirectory: './tools',
  skillsDirectory: './skills',
});
${useFirecrawlMcp ? `
// Firecrawl MCP integration for web scraping and searching
// Ensure FIRECRAWL_API_KEY is set in your environment
app.mcp('firecrawl', 'npx', ['-y', '@mendable/firecrawl-mcp-server']);
` : ''}
export default app;
`;

export const AVAILABLE_TOOLS = [
  {
    id: 'firecrawl_mcp',
    name: 'Firecrawl MCP Integration',
    description: 'Injects the Firecrawl MCP server into the agent for web scraping and searching. Requires FIRECRAWL_API_KEY.',
    isMcp: true,
    code: '' // Handled in getAgentTs directly
  },
  {
    id: 'host_run_terminal',
    name: 'Host Terminal Execution',
    description: 'Allows the agent to run arbitrary bash commands on the host machine. Powerful but potentially destructive.',
    isMcp: false,
    code: `import { Tool } from 'eve-framework';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default new Tool({
  name: 'host_run_terminal',
  description: 'Execute a bash command on the host machine.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to run.',
      },
    },
    required: ['command'],
  },
  execute: async ({ command }) => {
    try {
      const { stdout, stderr } = await execAsync(command);
      return { result: stdout || stderr || 'Command completed successfully (no output).' };
    } catch (error: any) {
      return { error: error.message };
    }
  },
});
`
  },
  {
    id: 'evolve_skill',
    name: 'Evolve Skill',
    description: 'Allows the agent to write new skills or modify existing ones within its skills/ directory.',
    isMcp: false,
    code: `import { Tool } from 'eve-framework';
import fs from 'fs/promises';
import path from 'path';

export default new Tool({
  name: 'evolve_skill',
  description: 'Create or update a skill in the skills directory.',
  parameters: {
    type: 'object',
    properties: {
      skillName: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['skillName', 'content'],
  },
  execute: async ({ skillName, content }, context) => {
    try {
      const skillsDir = context.skillsDirectory || './skills';
      await fs.mkdir(skillsDir, { recursive: true });
      const skillPath = path.join(skillsDir, \`\${skillName}.md\`);
      await fs.writeFile(skillPath, content, 'utf-8');
      return { result: \`Skill \${skillName} evolved successfully.\` };
    } catch (error: any) {
      return { error: error.message };
    }
  },
});
`
  }
];
