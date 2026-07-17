import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { convertToModelMessages, streamText, tool } from "ai";
import { z } from "zod";

const allowedModels = new Set([
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "xai/grok-2-latest",
  "openai/gpt-4o",
  "anthropic/claude-3-5-sonnet-20240620",
]);

const supportedTargets = ["Codex", "Claude", "Antigravity", "OpenCode", "Grok", "VS Code"] as const;

function normalizeCompatibility(markdown: string) {
  const section = markdown.match(/^##\s+Compatibility\s*$([\s\S]*?)(?=^##\s+|(?![\s\S]))/im)?.[1] ?? "";
  const frontmatter = markdown.match(/^compatibility:\s*(.+)$/im)?.[1] ?? "";
  const compatibilitySource = `${frontmatter}\n${section}`.toLowerCase();
  const selectedTargets = supportedTargets.filter((target) => compatibilitySource.includes(target.toLowerCase()));
  const normalizedTargets = selectedTargets.length ? selectedTargets : ["Codex", "Claude", "VS Code"];
  const list = normalizedTargets.map((target) => `- ${target}`).join("\n");
  const frontmatterLine = `compatibility: ${normalizedTargets.join(", ")}`;

  let next = markdown.match(/^compatibility:\s*.+$/im)
    ? markdown.replace(/^compatibility:\s*.+$/im, frontmatterLine)
    : markdown.replace(/^description:\s*.+$/im, (line) => `${line}\n${frontmatterLine}`);

  if (/^##\s+Compatibility\s*$/im.test(next)) {
    next = next.replace(/^##\s+Compatibility\s*$([\s\S]*?)(?=^##\s+|(?![\s\S]))/im, `## Compatibility\n${list}\n`);
  } else {
    next = `${next.trimEnd()}\n\n## Compatibility\n${list}\n`;
  }

  return next;
}

export async function POST(req: Request) {
  try {
    const { messages, model: requestedModel, currentSkill } = await req.json();

    if (!Array.isArray(messages)) {
      return Response.json({ error: "Missing or invalid messages." }, { status: 400 });
    }

    const modelId = allowedModels.has(requestedModel) ? requestedModel : "google/gemini-2.5-flash";
    const apiKeysHeader = req.headers.get("x-api-keys");
    let apiKeys: Record<string, string> = {};
    try {
      apiKeys = apiKeysHeader ? JSON.parse(apiKeysHeader) : {};
    } catch {
      return Response.json({ error: "Stored API keys are invalid. Open API keys and save them again." }, { status: 400 });
    }

    let aiModel;
    if (modelId.startsWith("anthropic/")) {
      const key = apiKeys.anthropic || process.env.ANTHROPIC_API_KEY || "";
      if (!key) return Response.json({ error: "An Anthropic API key is required for this model." }, { status: 400 });
      aiModel = createAnthropic({ apiKey: key })(modelId.replace("anthropic/", ""));
    } else if (modelId.startsWith("google/")) {
      const key = apiKeys.google || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
      if (!key) return Response.json({ error: "A Google Gemini API key is required for this model." }, { status: 400 });
      aiModel = createGoogleGenerativeAI({ apiKey: key })(modelId.replace("google/", ""));
    } else if (modelId.startsWith("xai/")) {
      const key = apiKeys.xai || process.env.XAI_API_KEY || "";
      if (!key) return Response.json({ error: "An xAI API key is required for this model." }, { status: 400 });
      aiModel = createXai({ apiKey: key })(modelId.replace("xai/", ""));
    } else {
      const key = apiKeys.openai || process.env.OPENAI_API_KEY || "";
      if (!key) return Response.json({ error: "An OpenAI API key is required for this model." }, { status: 400 });
      aiModel = createOpenAI({ apiKey: key })(modelId.replace("openai/", ""));
    }

    const systemPrompt = `You are the primary AI Copilot for an Agent Skill Builder.

Your job is to create and improve SKILL.md instruction files, not application code. The user expects you to update the editor directly whenever they ask to create, rewrite, repair, or improve a skill.

CURRENT SKILL.MD:
${typeof currentSkill === "string" && currentSkill.trim() ? currentSkill : "No current skill was provided."}

Rules:
1. Use the update_skill_markdown tool whenever the user asks to create or modify the skill.
2. Preserve useful existing content unless the user asks for a full rewrite.
3. Ask at most one concise clarification question only when a required fact is genuinely missing.
4. Never generate React, API, database, website, or infrastructure code.
5. YAML frontmatter name must be a lowercase hyphenated slug. The H1 title must be the human-readable skill name.
6. Include frontmatter description, license, compatibility, and metadata containing author and version.
7. Include an H1 title, ## Workflow, ## Permissions, ## Examples, and ## Compatibility.
8. Permission keys may only be: read_files, write_files, network, shell, browser, api_keys.
9. Compatibility targets may only be: Codex, Claude, Antigravity, OpenCode, Grok, VS Code. Omit unsupported targets even if the user requests them.
10. The first item under ## Examples must be a realistic prompt that can be used immediately as the Builder test input.
11. Use concrete instructions, failure handling, safety constraints, and usable examples.
12. After a successful tool update, briefly explain what changed. Do not paste the entire markdown into the chat response.`;

    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        update_skill_markdown: tool({
          description: "Replace the Builder editor contents with a complete, valid SKILL.md file.",
          inputSchema: z.object({
            markdown: z.string().min(100).describe("The complete SKILL.md content, including YAML frontmatter and all required sections."),
          }),
          execute: async ({ markdown }) => ({ success: true, updatedContent: normalizeCompatibility(markdown) }),
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => error instanceof Error ? error.message : "Copilot generation failed.",
    });
  } catch (error) {
    console.error("AI Skill Chat Error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Copilot generation failed." }, { status: 500 });
  }
}
