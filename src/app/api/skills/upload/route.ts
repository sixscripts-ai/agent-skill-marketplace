import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createSkillPackage } from "@/lib/repository";
import { buildFullSkillPackage } from "@/lib/skill-package-profile";
import { processSkillUpload } from "@/lib/skill-package";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((item): item is File => item instanceof File);
    const user = await requireCurrentUser();
    const processed = await processSkillUpload(files, user);
    const generated = buildFullSkillPackage({
      skillMd: processed.primarySkillMd ?? processed.suggestedSkillMd,
      files: processed.files,
      metadata: {
        displayName: processed.name,
        directoryName: processed.slug,
        category: processed.category,
        summary: processed.description,
        permissions: processed.permissions,
        targets: processed.compatibilityTargets,
      },
    });
    const record = await createSkillPackage({
      owner: user,
      uploadSource: processed.uploadSource,
      originalFilename: processed.originalFilename,
      blobPrefix: processed.blobPrefix,
      manifest: { ...processed.manifest, ...generated.manifest },
      files: generated.files,
    });

    return NextResponse.json({
      name: generated.metadata.displayName,
      description: generated.metadata.summary,
      slug: generated.metadata.directoryName,
      category: generated.metadata.category,
      permissions: generated.metadata.permissions,
      compatibilityTargets: generated.metadata.targets,
      issues: [...processed.issues, ...generated.profile.errors],
      suggestions: [...processed.suggestions, ...generated.profile.warnings],
      suggestedSkillMd: processed.suggestedSkillMd,
      primarySkillMd: generated.skillMd,
      packageUploadId: record.id,
      packageFiles: record.files,
      packageProfile: generated.profile,
      package: record,
    });
  } catch (error) {
    const securityResponse = securityErrorResponse(error);
    if (securityResponse) return securityResponse;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Skill upload failed." },
      { status: 400 },
    );
  }
}
