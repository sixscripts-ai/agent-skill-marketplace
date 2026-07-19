import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import {
  canPublishPublic,
  getEvidence,
  getEvidenceMany,
  isProveFresh,
  type ForgeEvidence,
} from "@/lib/marketplace-forge";
import { createOrUpdateSkill, createSkillPackage } from "@/lib/repository";
import { buildFullSkillPackage } from "@/lib/skill-package-profile";
import type { SkillDraftInput } from "@/lib/types";

type SkillsPostBody = SkillDraftInput & {
  forgeEvidenceIds?: string[];
  forgeProve?: ForgeEvidence;
  userApprovedHighRisk?: boolean;
  validationOk?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SkillsPostBody;
    const input = body as SkillDraftInput;
    const user = await requireCurrentUser();

    if (input.visibility === "public") {
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
      if (!validationOk && input.skillMd) {
        const generated = buildFullSkillPackage({
          skillMd: input.skillMd,
          metadata: {
            displayName: input.name,
            directoryName: input.slug,
            category: input.category,
            summary: input.summary,
            permissions: input.permissions,
            targets: input.compatibilityTargets,
          },
        });
        validationOk = generated.profile.valid;
      }

      const gate = canPublishPublic({
        validationOk,
        latestProve: prove,
        permissions: input.permissions ?? [],
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
    }

    if (!input.packageUploadId) {
      const generated = buildFullSkillPackage({
        skillMd: input.skillMd,
        metadata: {
          displayName: input.name,
          directoryName: input.slug,
          category: input.category,
          summary: input.summary,
          permissions: input.permissions,
          targets: input.compatibilityTargets,
        },
      });
      if (!generated.profile.valid) {
        return NextResponse.json(
          { error: generated.profile.errors.join(" "), profile: generated.profile },
          { status: 422 },
        );
      }
      const record = await createSkillPackage({
        owner: user,
        uploadSource: "paste",
        originalFilename: `${generated.metadata.directoryName}.zip`,
        blobPrefix: `skills/${user.id}/${generated.metadata.directoryName}/${Date.now()}`,
        manifest: generated.manifest,
        files: generated.files,
      });
      input.packageUploadId = record.id;
    }

    const skill = await createOrUpdateSkill(input, user);
    return NextResponse.json(
      {
        skill,
        urls: {
          detail: `/skills/${skill.slug}`,
          marketplace: "/marketplace",
          mySkills: "/skills",
          run: `/skills/${skill.slug}/run`,
          edit: `/builder/${skill.slug}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const securityResponse = securityErrorResponse(error);
    if (securityResponse) return securityResponse;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Skill save failed." },
      { status: 400 },
    );
  }
}
