import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findSkillPackage } from "@/lib/repository";
import { parseSkillMarkdown } from "@/lib/skill-import";

export async function POST(request: Request) {
  const body = (await request.json()) as { skillMd?: string; packageUploadId?: string };
  if (body.packageUploadId) {
    const user = await getCurrentUser();
    const skillPackage = await findSkillPackage(body.packageUploadId, user);
    const primary = skillPackage?.files.find((file) => file.role === "skill_md") ?? skillPackage?.files.find((file) => file.path.endsWith(".md"));
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
}
