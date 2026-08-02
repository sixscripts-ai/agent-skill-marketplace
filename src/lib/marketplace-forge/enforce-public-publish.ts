import {
  canPublishPublic,
  getEvidence,
  getEvidenceMany,
  isProveFresh,
  type ForgeEvidence,
} from "@/lib/marketplace-forge";
import { buildFullSkillPackage } from "@/lib/skill-package-profile";
import { NextResponse } from "next/server";

export type PublicPublishGateBody = {
  forgeEvidenceIds?: string[];
  forgeProve?: ForgeEvidence;
  userApprovedHighRisk?: boolean;
  validationOk?: boolean;
  skillMd?: string;
  name?: string;
  slug?: string;
  category?: string;
  summary?: string;
  permissions?: string[];
  compatibilityTargets?: string[];
};

export function enforcePublicPublishGate(body: PublicPublishGateBody, permissions: string[]) {
  const evidenceFromIds = Array.isArray(body.forgeEvidenceIds) ? getEvidenceMany(body.forgeEvidenceIds) : [];
  const prove =
    (body.forgeProve && body.forgeProve.kind === "sandbox_prove" ? body.forgeProve : undefined) ||
    evidenceFromIds.find((item) => item.kind === "sandbox_prove" && isProveFresh(item)) ||
    (typeof body.forgeEvidenceIds?.[0] === "string" ? getEvidence(body.forgeEvidenceIds[0]) : undefined);

  if (!prove || prove.kind !== "sandbox_prove") {
    return NextResponse.json(
      {
        error: "Public publish requires forge prove evidence.",
        reason: "Provide forgeProve or forgeEvidenceIds with a successful sandbox_prove evidence record.",
      },
      { status: 403 },
    );
  }

  let validationOk =
    typeof body.validationOk === "boolean"
      ? body.validationOk
      : evidenceFromIds.some((item) => item.kind === "validation" && item.ok);

  if (!validationOk && body.skillMd) {
    const generated = buildFullSkillPackage({
      skillMd: body.skillMd,
      metadata: {
        displayName: body.name,
        directoryName: body.slug,
        category: body.category,
        summary: body.summary,
        permissions,
        targets: body.compatibilityTargets,
      },
    });
    validationOk = generated.profile.valid;
  }

  const gate = canPublishPublic({
    validationOk,
    latestProve: prove,
    permissions,
    userApprovedHighRisk: Boolean(body.userApprovedHighRisk),
  });

  if (!gate.ok) {
    return NextResponse.json(
      {
        error: gate.reason,
        reason: gate.reason,
        missingEvidence: !isProveFresh(prove) ? ["sandbox_prove"] : [],
      },
      { status: 403 },
    );
  }

  return null;
}
