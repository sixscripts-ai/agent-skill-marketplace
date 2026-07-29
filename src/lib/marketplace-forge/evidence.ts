import { FORGE_PROVE_TTL_MS, type ForgeEvidence } from "./types";

const store = new Map<string, ForgeEvidence>();

function evidenceId() {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEvidence(input: Omit<ForgeEvidence, "id" | "at"> & { id?: string; at?: string }): ForgeEvidence {
  const evidence: ForgeEvidence = {
    id: input.id ?? evidenceId(),
    kind: input.kind,
    ok: input.ok,
    at: input.at ?? new Date().toISOString(),
    summary: input.summary,
    details: input.details,
  };
  store.set(evidence.id, evidence);
  return evidence;
}

export function getEvidence(id: string): ForgeEvidence | undefined {
  return store.get(id);
}

export function getEvidenceMany(ids: string[]): ForgeEvidence[] {
  return ids.map((id) => store.get(id)).filter((item): item is ForgeEvidence => Boolean(item));
}

export function listEvidence(): ForgeEvidence[] {
  return [...store.values()];
}

export function isProveFresh(evidence: ForgeEvidence | undefined, ttlMs = FORGE_PROVE_TTL_MS): boolean {
  if (!evidence || evidence.kind !== "sandbox_prove" || !evidence.ok) return false;
  const at = Date.parse(evidence.at);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at <= ttlMs;
}

export function latestFreshProve(evidenceList: ForgeEvidence[], ttlMs = FORGE_PROVE_TTL_MS): ForgeEvidence | undefined {
  const sorted = evidenceList
    .filter((item) => item.kind === "sandbox_prove")
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return sorted.find((item) => isProveFresh(item, ttlMs));
}
