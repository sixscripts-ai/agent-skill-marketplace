export const AI_MODEL_OPTIONS = [
  ["google/gemini-2.5-flash", "Gemini 2.5 Flash"],
  ["google/gemini-2.5-pro", "Gemini 2.5 Pro"],
  ["xai/grok-4.5", "Grok 4.5"],
  ["groq/llama-3.3-70b-versatile", "Llama 3.3 (Groq)"],
  ["groq/mixtral-8x7b-32768", "Mixtral (Groq)"],
  ["deepseek/deepseek-v4-flash", "DeepSeek V4 Flash"],
  ["deepseek/deepseek-v4-pro", "DeepSeek V4 Pro"],
  ["openai/gpt-4o", "GPT-4o"],
  ["anthropic/claude-3-5-sonnet-20240620", "Claude 3.5 Sonnet"],
] as const;

export const AI_MODEL_IDS = new Set<string>(AI_MODEL_OPTIONS.map(([value]) => value));

export function providerKeyName(modelId: string) {
  const provider = modelId.split("/")[0];
  return provider === "google" ? "google" : provider;
}

export function providerLabel(modelId: string) {
  const provider = modelId.split("/")[0];
  if (provider === "google") return "Google Gemini";
  if (provider === "anthropic") return "Anthropic";
  if (provider === "xai") return "xAI";
  if (provider === "groq") return "Groq";
  if (provider === "deepseek") return "DeepSeek";
  return "OpenAI";
}
