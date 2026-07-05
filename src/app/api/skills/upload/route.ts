import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createSkillPackage } from "@/lib/repository";
import { processSkillUpload } from "@/lib/skill-package";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((item): item is File => item instanceof File);
    const user = await requireCurrentUser();
    const processed = await processSkillUpload(files, user);
    const record = await createSkillPackage({
      owner: user,
      uploadSource: processed.uploadSource,
      originalFilename: processed.originalFilename,
      blobPrefix: processed.blobPrefix,
      manifest: processed.manifest,
      files: processed.files,
    });

    return NextResponse.json({
      name: processed.name,
      description: processed.description,
      slug: processed.slug,
      category: processed.category,
      permissions: processed.permissions,
      compatibilityTargets: processed.compatibilityTargets,
      issues: processed.issues,
      suggestions: processed.suggestions,
      suggestedSkillMd: processed.suggestedSkillMd,
      primarySkillMd: processed.primarySkillMd,
      packageUploadId: record.id,
      packageFiles: record.files,
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
