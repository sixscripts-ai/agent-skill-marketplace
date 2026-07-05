import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { findSkillPackage } from "@/lib/repository";
import { parseSkillMarkdown } from "@/lib/skill-import";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { skillMd?: string; packageUploadId?: string };
    const user = await requireCurrentUser();
    if (body.packageUploadId) {
      const skillPackage = await findSkillPackage(body.packageUploadId, user);
      const primary =
        skillPackage?.files.find((file) => file.role === "skill_md") ??
        skillPackage?.files.find((file) => file.path.endsWith(".md"));
      if (!skillPackage || !primary?.content) {
        return NextResponse.json({ error: "Uploaded package not found or missing readable skill file." }, { status: 404 });
      }
      return NextResponse.json({
        ...parseSkillMarkdown(primary.content),
        packageUploadId: skillPackage.id,
        packageFiles: skillPackage.files,
      });
    }
    return NextResponse.json(parseSkillMarkdown(body.skillMd ?? ""));
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: "Skill import failed." }, { status: 400 });
  }
}
