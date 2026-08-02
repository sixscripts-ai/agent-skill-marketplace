"use server";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { AI_MODEL_IDS, DEFAULT_AI_MODEL, resolveAiModelId } from "@/lib/ai-model-catalog";

export async function generateCopilotRefinement(
  prompt: string,
  currentInstructions: string,
  requestedModel = DEFAULT_AI_MODEL,
  apiKeys: Record<string, string> = {},
) {
  const modelId = resolveAiModelId(AI_MODEL_IDS.has(requestedModel) ? requestedModel : DEFAULT_AI_MODEL);
  const provider = modelId.split("/")[0];
  const modelName = modelId.slice(provider.length + 1);
  const key = apiKeys[provider] || providerKey(provider);
  if (!key) throw new Error(`An API key is required for ${provider}.`);

  const model = provider === "xai"
    ? createXai({ apiKey: key })(modelName)
    : provider === "groq"
      ? createGroq({ apiKey: key })(modelName)
      : provider === "anthropic"
        ? createAnthropic({ apiKey: key })(modelName)
        : provider === "deepseek"
          ? createOpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" })(modelName)
          : createOpenAI({ apiKey: key })(modelName);

  const { text } = await generateText({
    model,
    system: `You are the AI Architect for an Eve filesystem-first agent project. Rewrite the complete instructions.md using the user's request and current instructions. Return only the finished Markdown. Do not wrap it in a code fence. Preserve useful constraints, define identity, goals, tools, permission boundaries, failure handling, and verification steps.\n\nCurrent instructions:\n${currentInstructions}`,
    prompt,
  });
  return text;
}

function providerKey(provider: string) {
  if (provider === "xai") return process.env.XAI_API_KEY || "";
  if (provider === "groq") return process.env.GROQ_API_KEY || "";
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY || "";
  if (provider === "deepseek") return process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "";
  return process.env.OPENAI_API_KEY || "";
}
