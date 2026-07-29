import type { ForgeEvidence, ForgeRunMetrics, ForgeToolName } from "./types";

export type ForgeMetricsState = {
  steps: number;
  toolCounts: Partial<Record<ForgeToolName, number>>;
  startedAt: number;
  hitlCount: number;
  evidence: ForgeEvidence[];
};

export function buildMetrics(state: ForgeMetricsState): ForgeRunMetrics {
  return {
    steps: state.steps,
    toolCounts: { ...state.toolCounts },
    latencyMs: Math.max(0, Date.now() - state.startedAt),
    evidenceOk: state.evidence.filter((item) => item.ok).length,
    hitlCount: state.hitlCount,
  };
}
