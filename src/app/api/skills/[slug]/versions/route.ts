import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { latestVersion } from "@/lib/data";
import { createOrUpdateSkill, findSkill } from "@/lib/repository";
import type { SkillDraftInput } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const existing = await findSkill(slug, user);
  const body = (await request.json()) as Partial<SkillDraftInput>;
  if (!existing && !body.skillMd) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  const current = existing ? latestVersion(existing) : undefined;
  const skill = await createOrUpdateSkill(
    {
      name: body.name ?? existing?.name ?? slug,
      slug,
      category: body.category ?? existing?.category ?? "Automation",
      summary: body.summary ?? existing?.summary ?? "Published skill version.",
      skillMd: body.skillMd ?? current?.skillMd ?? "",
      permissions: body.permissions ?? existing?.permissions.map((permission) => permission.key) ?? ["read_files"],
      compatibilityTargets: body.compatibilityTargets ?? current?.compatibilityTargets ?? ["Codex", "Claude", "VS Code"],
      visibility: body.visibility ?? existing?.visibility ?? "public",
    },
    user,
  );
  return NextResponse.json(skill, { status: 201 });
}
