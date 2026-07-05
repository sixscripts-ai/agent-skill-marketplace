import type { SandboxProvider } from "./types";

export const sandboxProviders: {
  id: SandboxProvider;
  label: string;
  model: string;
  mode: "openai-compatible" | "local-deterministic";
  keyEnv?: string;
  baseUrlEnv?: string;
  defaultBaseUrl?: string;
  modelEnv?: string;
}[] = [
  {
    id: "openai",
    label: "OpenAI",
    model: "gpt-4o-mini",
    mode: "openai-compatible",
    keyEnv: "OPENAI_API_KEY",
    baseUrlEnv: "OPENAI_BASE_URL",
    defaultBaseUrl: "https://api.openai.com/v1",
    modelEnv: "OPENAI_MODEL",
  },
  { id: "gemini", label: "Gemini", model: "gemini-2.0-flash", mode: "local-deterministic" },
  {
    id: "groq",
    label: "Groq",
    model: "llama-3.3-70b-versatile",
    mode: "openai-compatible",
    keyEnv: "GROQ_API_KEY",
    baseUrlEnv: "GROQ_BASE_URL",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    modelEnv: "GROQ_MODEL",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    model: "openrouter/auto",
    mode: "openai-compatible",
    keyEnv: "OPENROUTER_API_KEY",
    baseUrlEnv: "OPENROUTER_BASE_URL",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    modelEnv: "OPENROUTER_MODEL",
  },
  { id: "local", label: "Local model", model: "llama.cpp/local", mode: "local-deterministic" },
];

export function getProvider(provider: string | undefined) {
  return sandboxProviders.find((item) => item.id === provider) ?? sandboxProviders[0];
}

export function getProviderRuntime(provider: SandboxProvider) {
  const config = getProvider(provider);
  const apiKey = config.keyEnv ? process.env[config.keyEnv] : undefined;
  return {
    ...config,
    apiKey,
    baseUrl: config.baseUrlEnv ? (process.env[config.baseUrlEnv] ?? config.defaultBaseUrl) : config.defaultBaseUrl,
    model: config.modelEnv ? (process.env[config.modelEnv] ?? config.model) : config.model,
    isLive: config.mode === "openai-compatible" && Boolean(apiKey && config.defaultBaseUrl),
  };
}
