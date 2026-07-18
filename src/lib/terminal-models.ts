import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { AI_MODEL_IDS, AI_MODEL_OPTIONS } from "@/lib/ai-model-catalog";

export const DEFAULT_TERMINAL_MODEL = "xai/grok-4.3";

export function resolveTerminalModelId(requested?: string) {
  if (requested && AI_MODEL_IDS.has(requested as (typeof AI_MODEL_OPTIONS)[number][0])) {
    return requested;
  }
  return DEFAULT_TERMINAL_MODEL;
}

export function resolveTerminalModel(modelId: string, apiKeys: Record<string, string> = {}) {
  const provider = modelId.split("/")[0];
  const model = modelId.slice(provider.length + 1);
  const key =
    apiKeys[provider === "google" ? "google" : provider] ||
    (provider === "google"
      ? process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""
      : provider === "xai"
        ? process.env.XAI_API_KEY || ""
        : provider === "groq"
          ? process.env.GROQ_API_KEY || ""
          : provider === "anthropic"
            ? process.env.ANTHROPIC_API_KEY || ""
            : provider === "deepseek"
              ? process.env.DEEPSEEK_API_KEY || ""
              : process.env.OPENAI_API_KEY || "");

  if (!key) {
    return {
      error: {
        error: true,
        code: "MISSING_API_KEY",
        message: `An API key is required for ${provider}.`,
        suggestion: `Set ${provider === "deepseek" ? "DEEPSEEK_API_KEY" : provider === "xai" ? "XAI_API_KEY" : `${provider.toUpperCase()}_API_KEY`} in env or pass BYOK headers.`,
      },
    } as const;
  }

  if (provider === "google") return { model: createGoogleGenerativeAI({ apiKey: key })(model) } as const;
  if (provider === "xai") return { model: createXai({ apiKey: key })(model) } as const;
  if (provider === "groq") return { model: createGroq({ apiKey: key })(model) } as const;
  if (provider === "anthropic") return { model: createAnthropic({ apiKey: key })(model) } as const;
  if (provider === "deepseek") {
    return { model: createOpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" })(model) } as const;
  }
  return { model: createOpenAI({ apiKey: key })(model) } as const;
}
