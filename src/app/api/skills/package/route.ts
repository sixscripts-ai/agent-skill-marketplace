import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createSkillPackage } from "@/lib/repository";
import { buildFullSkillPackage, type GeneratedSkillFileInput, type GeneratedSkillMetadata } from "@/lib/skill-package-profile";
import type { SkillPackageFile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      skillMd?: string;
      files?: Array<GeneratedSkillFileInput | SkillPackageFile>;
      metadata?: GeneratedSkillMetadata;
    };
    if (!body.skillMd?.trim()) {
      return NextResponse.json({ error: "SKILL.md content is required." }, { status: 400 });
    }

    const user = await requireCurrentUser();
    const generated = buildFullSkillPackage({
      skillMd: body.skillMd,
      files: body.files,
      metadata: body.metadata,
    });
    if (!generated.profile.valid) {
      return NextResponse.json(
        { ...generated, error: generated.profile.errors.join(" ") },
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

    return NextResponse.json({
      ...generated,
      packageUploadId: record.id,
      packageFiles: record.files,
    });
  } catch (error) {
    const securityResponse = securityErrorResponse(error);
    if (securityResponse) return securityResponse;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Skill package generation failed." },
      { status: 400 },
    );
  }
}
