import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createOrUpdateSkill, createSkillPackage } from "@/lib/repository";
import { buildFullSkillPackage } from "@/lib/skill-package-profile";
import { enforcePublicPublishGate, type PublicPublishGateBody } from "@/lib/marketplace-forge/enforce-public-publish";
import type { SkillDraftInput } from "@/lib/types";

type SkillsPostBody = SkillDraftInput & PublicPublishGateBody;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SkillsPostBody;
    const input = body as SkillDraftInput;
    const user = await requireCurrentUser();

    if (input.visibility === "public") {
      const blocked = enforcePublicPublishGate(body, input.permissions ?? []);
      if (blocked) return blocked;
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
          run: `/skills/${skill.slug}?stage=sandbox`,
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
