export type ForgeToolName =
  | "update_skill_package"
  | "validate_skill_package"
  | "run_sandbox_prove"
  | "publish_skill_draft"
  | "request_public_publish";

export type ForgeEvidence = {
  id: string;
  kind: "validation" | "sandbox_prove" | "publish";
  ok: boolean;
  at: string;
  summary: string;
  details?: Record<string, unknown>;
};

export type ForgeToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  evidence?: ForgeEvidence;
};

export type ForgeRunMetrics = {
  steps: number;
  toolCounts: Partial<Record<ForgeToolName, number>>;
  latencyMs: number;
  evidenceOk: number;
  hitlCount: number;
};

export type ForgeEvent =
  | { type: "plan"; steps: string[] }
  | { type: "tool_start"; tool: ForgeToolName; input: unknown }
  | { type: "tool_result"; tool: ForgeToolName; result: ForgeToolResult }
  | { type: "message"; role: "assistant"; content: string }
  | { type: "hitl"; reason: string; action: "approve_publish" | "confirm_destructive" | "clarify" }
  | { type: "complete"; packageId?: string; evidenceIds: string[]; metrics: ForgeRunMetrics }
  | { type: "continuation"; prompt: string; batch: number };

export type ForgeLoopOptions = {
  maxSteps?: number;
  maxBatches?: number;
  continuation?: string;
};

export const FORGE_MAX_STEPS = 12;
export const FORGE_MAX_BATCHES = 5;
export const FORGE_PROVE_TTL_MS = 24 * 60 * 60 * 1000;
export const FORGE_NETWORK_ALLOWLIST = ["registry.npmjs.org", "github.com"] as const;
