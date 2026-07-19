import { isProveFresh } from "./evidence";
import type { ForgeEvidence } from "./types";

const HIGH_RISK_PERMISSIONS = new Set(["shell", "api_keys"]);

export function canPublishPublic(input: {
  validationOk: boolean;
  latestProve?: ForgeEvidence;
  permissions: string[];
  userApprovedHighRisk: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.validationOk) {
    return { ok: false, reason: "Public publish requires a successful package validation." };
  }
  if (!input.latestProve || !isProveFresh(input.latestProve)) {
    return { ok: false, reason: "Public publish requires a fresh successful sandbox prove (within 24h)." };
  }
  const needsHighRisk = input.permissions.some((permission) => HIGH_RISK_PERMISSIONS.has(permission));
  if (needsHighRisk && !input.userApprovedHighRisk) {
    return {
      ok: false,
      reason: "Public publish with high-risk permissions (shell, api_keys) requires explicit user approval.",
    };
  }
  return { ok: true };
}
