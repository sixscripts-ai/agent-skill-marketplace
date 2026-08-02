export const AI_MODEL_OPTIONS = [
  ["xai/grok-4.3", "Grok 4.3"],
  ["xai/grok-4.5", "Grok 4.5"],
  ["groq/llama-3.3-70b-versatile", "Llama 3.3 (Groq)"],
  ["groq/mixtral-8x7b-32768", "Mixtral (Groq)"],
  ["deepseek/deepseek-v4-flash", "DeepSeek V4 Flash"],
  ["deepseek/deepseek-v4-pro", "DeepSeek V4 Pro"],
  ["openai/gpt-4o", "GPT-4o"],
  ["anthropic/claude-3-5-sonnet-20240620", "Claude 3.5 Sonnet"],
] as const;

export type AiModelId = (typeof AI_MODEL_OPTIONS)[number][0];

export const AI_MODEL_IDS = new Set<string>(AI_MODEL_OPTIONS.map(([value]) => value));

export const DEFAULT_AI_MODEL: AiModelId = "xai/grok-4.3";

export function resolveAiModelId(requested?: string | null): AiModelId {
  if (requested && AI_MODEL_IDS.has(requested)) return requested as AiModelId;
  return DEFAULT_AI_MODEL;
}

export function providerKeyName(modelId: string) {
  return modelId.split("/")[0] || "openai";
}

export function providerLabel(modelId: string) {
  const provider = providerKeyName(modelId);
  if (provider === "anthropic") return "Anthropic";
  if (provider === "xai") return "xAI";
  if (provider === "groq") return "Groq";
  if (provider === "deepseek") return "DeepSeek";
  return "OpenAI";
}
