import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const systemPrompt = `You are an expert AI Agent Skill creator.
Your job is to generate a fully formatted SKILL.md file based on the user's prompt.
The generated text MUST be valid Markdown with YAML frontmatter.

The SKILL.md MUST adhere to the following structure exactly:
1. YAML frontmatter containing 'name' (lowercase, hyphenated) and 'description' (short summary).
2. An H1 heading matching the human-readable name of the skill.
3. A "## Workflow" section with a numbered list of steps.
4. A "## Permissions" section with a bulleted list. Use only these keys: read_files, write_files, network, shell, browser, run_evals, install_deps.
5. A "## Examples" section with a bulleted list of user queries that would trigger the skill.
6. A "## Compatibility" section with a bulleted list (e.g. Codex, Claude, Antigravity).

Output NOTHING but the raw markdown text. Do not wrap in backticks like \`\`\`markdown. Just output the raw content starting with ---.`;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: prompt,
    });
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("AI Skill Generate Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
