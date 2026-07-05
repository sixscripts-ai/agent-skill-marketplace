import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { latestVersion } from "@/lib/data";
import { createOrUpdateSkill, findSkill } from "@/lib/repository";
import type { SkillDraftInput } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const existing = await findSkill(slug, user);
  if (!existing) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  const body = (await request.json()) as Partial<SkillDraftInput>;
  const version = latestVersion(existing);
  const skill = await createOrUpdateSkill(
    {
      name: body.name ?? existing.name,
      slug,
      category: body.category ?? existing.category,
      summary: body.summary ?? existing.summary,
      skillMd: body.skillMd ?? version.skillMd,
      permissions: body.permissions ?? existing.permissions.map((permission) => permission.key),
      compatibilityTargets: body.compatibilityTargets ?? version.compatibilityTargets,
      visibility: body.visibility ?? existing.visibility ?? "public",
    },
    user,
  );
  return NextResponse.json(skill);
}
