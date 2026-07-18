"use server";

import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import type { AgentProject } from "@/lib/eve/agent-project";

export type EveArchitectMessage = {
  role: "user" | "assistant";
  content: string;
};

export type EveArchitectResult = {
  status: "clarify";
  message: string;
  questions: string[];
  plan: string[];
} | {
  status: "update";
  update: Partial<AgentProject>;
  plan: string[];
  complete: boolean;
  continuationPrompt?: string;
};

export async function architectAgentProject(
  prompt: string,
  current: AgentProject,
  modelId: string,
  apiKeys: Record<string, string>,
  history: EveArchitectMessage[],
  continuation?: string
): Promise<EveArchitectResult> {
  const model = resolveModel(modelId, apiKeys);
  const systemPrompt = `You are Eve's production Agent Architect. Return one valid JSON object and nothing else.
If you need clarification from the user to proceed safely, return:
{ "status": "clarify", "message": "...", "questions": ["..."], "plan": ["..."] }

If you can proceed with updating the project, return:
{
  "status": "update",
  "update": { ... AgentProject fields ... },
  "plan": ["..."],
  "complete": true | false,
  "continuationPrompt": "..." (if complete is false)
}

You may update these keys in the project: metadata, brief, runtimeModel, runtime, tools, skills, permissions, tests, files. Preserve unrelated configuration.
Every skill must contain slug, name, summary, and permissions. Every file must contain path and content.
When the user asks for a complete implementation, include the actual runnable files in files rather than only describing them.
Do not include secrets. Do not use markdown fences.
Current project: ${JSON.stringify(current)}
Continuation context: ${continuation || "None"}`;

  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages: history.map(h => ({ role: h.role, content: h.content })),
  });
  
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Architect returned invalid JSON. Retry the request or shorten it into architecture and implementation phases.");
  }
  
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Architect returned an invalid project update.");
  return parsed as EveArchitectResult;
}

function resolveModel(modelId: string, apiKeys: Record<string, string>) {
  const provider = modelId.split("/")[0];
  const model = modelId.slice(provider.length + 1);
  const key = apiKeys[provider === "google" ? "google" : provider] || providerKey(provider);
  if (!key) throw new Error(`An API key is required for ${provider}.`);
  if (provider === "google") return createGoogleGenerativeAI({ apiKey: key })(model);
  if (provider === "xai") return createXai({ apiKey: key })(model);
  if (provider === "groq") return createGroq({ apiKey: key })(model);
  if (provider === "deepseek") return createOpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" })(model);
  if (provider === "anthropic") return createAnthropic({ apiKey: key })(model);
  return createOpenAI({ apiKey: key })(model);
}

function providerKey(provider: string) {
  if (provider === "google") return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
  if (provider === "xai") return process.env.XAI_API_KEY || "";
  if (provider === "groq") return process.env.GROQ_API_KEY || "";
  if (provider === "deepseek") return process.env.DEEPSEEK_API_KEY || "";
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY || "";
  return process.env.OPENAI_API_KEY || "";
}
