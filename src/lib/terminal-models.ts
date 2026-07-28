import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { AI_MODEL_IDS, AI_MODEL_OPTIONS, DEFAULT_AI_MODEL, type AiModelId } from "@/lib/ai-model-catalog";

export const TERMINAL_MODEL_OPTIONS = AI_MODEL_OPTIONS;
export type TerminalModelId = AiModelId;
export const DEFAULT_TERMINAL_MODEL: TerminalModelId = DEFAULT_AI_MODEL;

export function resolveTerminalModelId(requested?: string): TerminalModelId {
  if (!requested) return DEFAULT_TERMINAL_MODEL;
  if (!AI_MODEL_IDS.has(requested)) {
    throw Object.assign(new Error(`Unsupported terminal model: ${requested}.`), {
      code: "UNSUPPORTED_MODEL",
      status: 400,
    });
  }
  return requested as TerminalModelId;
}

function providerEnvKey(provider: string) {
  if (provider === "xai") return process.env.XAI_API_KEY || "";
  if (provider === "groq") return process.env.GROQ_API_KEY || "";
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY || "";
  if (provider === "deepseek") return process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "";
  return process.env.OPENAI_API_KEY || "";
}

export function resolveTerminalModel(modelId: string, apiKeys: Record<string, string> = {}) {
  const resolvedId = resolveTerminalModelId(modelId);
  const provider = resolvedId.split("/")[0] || "";
  const model = resolvedId.slice(provider.length + 1);
  const key = apiKeys[provider]?.trim() || providerEnvKey(provider);
  if (!key) {
    return {
      error: {
        error: true,
        code: "MISSING_API_KEY",
        message: `An API key is required for ${provider || "the selected provider"}.`,
        suggestion: `Set the ${provider} server key or provide it through API settings.`,
      },
    } as const;
  }
  if (provider === "xai") return { model: createXai({ apiKey: key })(model), modelId: resolvedId } as const;
  if (provider === "groq") return { model: createGroq({ apiKey: key })(model), modelId: resolvedId } as const;
  if (provider === "deepseek") {
    return { model: createOpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" })(model), modelId: resolvedId } as const;
  }
  if (provider === "anthropic") return { model: createAnthropic({ apiKey: key })(model), modelId: resolvedId } as const;
  return { model: createOpenAI({ apiKey: key })(model), modelId: resolvedId } as const;
}
