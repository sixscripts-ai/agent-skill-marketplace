"use server";

import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import type { AgentProject } from "@/lib/eve/agent-project";

export async function architectAgentProject(prompt: string, current: AgentProject, modelId: string, apiKeys: Record<string, string>) {
  const model = resolveModel(modelId, apiKeys);
  const { text } = await generateText({
    model,
    system: `You are an Agent Architect. Return only a JSON object with optional keys: metadata, brief, runtimeModel, runtime, tools, skills, permissions, tests. Improve the existing project without deleting unrelated configuration. Do not return markdown fences. Current project: ${JSON.stringify(current)}`,
    prompt,
  });
  const parsed = JSON.parse(text.trim().replace(/^```json\s*/i, "").replace(/```$/, "")) as Partial<AgentProject>;
  return parsed;
}

function resolveModel(modelId: string, apiKeys: Record<string, string>) {
  const provider = modelId.split("/")[0];
  const model = modelId.slice(provider.length + 1);
  const key = apiKeys[provider === "google" ? "google" : provider] || (provider === "google" ? process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY : provider === "xai" ? process.env.XAI_API_KEY : provider === "groq" ? process.env.GROQ_API_KEY : provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY) || "";
  if (!key) throw new Error(`An API key is required for ${provider}.`);
  if (provider === "google") return createGoogleGenerativeAI({ apiKey: key })(model);
  if (provider === "xai") return createXai({ apiKey: key })(model);
  if (provider === "groq") return createGroq({ apiKey: key })(model);
  if (provider === "anthropic") return createAnthropic({ apiKey: key })(model);
  return createOpenAI({ apiKey: key })(model);
}
