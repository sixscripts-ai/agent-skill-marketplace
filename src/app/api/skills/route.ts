import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createOrUpdateSkill, createSkillPackage } from "@/lib/repository";
import { buildFullSkillPackage } from "@/lib/skill-package-profile";
import type { SkillDraftInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as SkillDraftInput;
    const user = await requireCurrentUser();

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
