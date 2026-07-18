"use server";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";

const allowedModels = new Set([
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "xai/grok-2-latest",
  "groq/llama-3.3-70b-versatile",
  "groq/mixtral-8x7b-32768",
  "openai/gpt-4o",
  "anthropic/claude-3-5-sonnet-20240620",
]);

export async function generateCopilotRefinement(prompt: string, currentInstructions: string, requestedModel = "google/gemini-2.5-flash", apiKeys: Record<string, string> = {}) {
  const modelId = allowedModels.has(requestedModel) ? requestedModel : "google/gemini-2.5-flash";
  const provider = modelId.split("/")[0];
  const modelName = modelId.slice(provider.length + 1);
  const key = apiKeys[provider === "google" ? "google" : provider] || providerKey(provider);
  if (!key) throw new Error(`An API key is required for ${provider}.`);

  const model = provider === "google"
    ? createGoogleGenerativeAI({ apiKey: key })(modelName)
    : provider === "xai"
      ? createXai({ apiKey: key })(modelName)
      : provider === "groq"
        ? createGroq({ apiKey: key })(modelName)
        : provider === "anthropic"
          ? createAnthropic({ apiKey: key })(modelName)
          : createOpenAI({ apiKey: key })(modelName);

  const { text } = await generateText({
    model,
    system: `You are the AI Architect for an Eve filesystem-first agent project. Rewrite the complete instructions.md using the user's request and current instructions. Return only the finished Markdown. Do not wrap it in a code fence. Preserve useful constraints, define identity, goals, tools, permission boundaries, failure handling, and verification steps.\n\nCurrent instructions:\n${currentInstructions}`,
    prompt,
  });
  return text;
}

function providerKey(provider: string) {
  if (provider === "google") return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
  if (provider === "xai") return process.env.XAI_API_KEY || "";
  if (provider === "groq") return process.env.GROQ_API_KEY || "";
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY || "";
  return process.env.OPENAI_API_KEY || "";
}
