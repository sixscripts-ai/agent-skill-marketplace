import { createXai } from "@ai-sdk/xai";

export const TERMINAL_MODEL_OPTIONS = [
  ["xai/grok-4.5", "Grok 4.5"],
  ["xai/grok-4.3", "Grok 4.3"],
] as const;

export type TerminalModelId = (typeof TERMINAL_MODEL_OPTIONS)[number][0];
export const DEFAULT_TERMINAL_MODEL: TerminalModelId = "xai/grok-4.3";
const TERMINAL_MODEL_IDS = new Set<string>(TERMINAL_MODEL_OPTIONS.map(([value]) => value));

export function resolveTerminalModelId(requested?: string): TerminalModelId {
  if (!requested) return DEFAULT_TERMINAL_MODEL;
  if (!TERMINAL_MODEL_IDS.has(requested)) {
    throw Object.assign(new Error(`Unsupported terminal model: ${requested}. Choose Grok 4.5 or Grok 4.3.`), { code: "UNSUPPORTED_MODEL", status: 400 });
  }
  return requested as TerminalModelId;
}

export function resolveTerminalModel(modelId: string, apiKeys: Record<string, string> = {}) {
  const resolvedId = resolveTerminalModelId(modelId);
  const model = resolvedId.slice("xai/".length);
  const key = apiKeys.xai?.trim() || process.env.XAI_API_KEY || "";
  if (!key) {
    return { error: { error: true, code: "MISSING_API_KEY", message: "An xAI API key is required for the terminal agent.", suggestion: "Set XAI_API_KEY in the server environment or provide the xAI key through API settings." } } as const;
  }
  return { model: createXai({ apiKey: key })(model), modelId: resolvedId } as const;
}
