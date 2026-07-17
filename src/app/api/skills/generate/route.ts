import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { messages, model: requestedModel } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Missing or invalid messages", { status: 400 });
    }

    const apiKeysHeader = req.headers.get("x-api-keys");
    const apiKeys = apiKeysHeader ? JSON.parse(apiKeysHeader) : {};

    let aiModel;
    if (requestedModel?.startsWith("anthropic/")) {
      const anthropic = createAnthropic({ apiKey: apiKeys.anthropic || process.env.ANTHROPIC_API_KEY || "" });
      aiModel = anthropic(requestedModel.replace("anthropic/", ""));
    } else if (requestedModel?.startsWith("google/")) {
      const google = createGoogleGenerativeAI({ apiKey: apiKeys.google || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "" });
      aiModel = google(requestedModel.replace("google/", ""));
    } else if (requestedModel?.startsWith("xai/")) {
      const xai = createXai({ apiKey: apiKeys.xai || process.env.XAI_API_KEY || "" });
      aiModel = xai(requestedModel.replace("xai/", ""));
    } else {
      const openai = createOpenAI({ apiKey: apiKeys.openai || process.env.OPENAI_API_KEY || "" });
      aiModel = openai(requestedModel ? requestedModel.replace("openai/", "") : "gpt-4o-mini");
    }

    const systemPrompt = `You are an expert AI Agent Skill creator and pair programmer.
Your job is to help the user build an autonomous agent skill.
When you are ready to update the skill code, or if the user asks you to create/update the skill, you MUST call the \`update_skill_markdown\` tool. Do NOT output raw markdown directly in your message if it's meant to be the final skill code; use the tool instead.
You can converse with the user to clarify requirements before generating the skill.

When calling the \`update_skill_markdown\` tool, the content MUST adhere to the Agent Skills Specification exactly:
1. YAML frontmatter containing 'name' (lowercase, hyphenated), 'description' (short summary), 'license', 'compatibility', and 'metadata' (with 'author' and 'version').
2. An H1 heading matching the human-readable name of the skill.
3. A "## Workflow" section with a numbered list of steps.
4. A "## Permissions" section with a bulleted list. Use only these keys: read_files, write_files, network, shell, browser, run_evals, install_deps.
5. A "## Examples" section with a bulleted list of user queries that would trigger the skill.
6. A "## Compatibility" section with a bulleted list (e.g. Codex, Claude, Antigravity).

Never output markdown blocks in your conversational response if you intend to update the editor. Always use the tool.`;

    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: messages,
      tools: {
        update_skill_markdown: tool({
          description: "Update the SKILL.md code editor with the generated markdown content.",
          parameters: z.object({
            markdown: z.string().describe("The fully formatted SKILL.md markdown content including YAML frontmatter."),
          }),
          // @ts-expect-error - AI SDK types for client-side tool execution are mismatched
          execute: async ({ markdown }) => {
            return { success: true, updatedContent: markdown };
          },
        }),
      },
    });
    
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI Skill Chat Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
