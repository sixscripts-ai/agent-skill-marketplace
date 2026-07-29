import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { latestVersion } from "@/lib/data";
import { enforcePublicPublishGate, type PublicPublishGateBody } from "@/lib/marketplace-forge/enforce-public-publish";
import { createOrUpdateSkill, findSkill } from "@/lib/repository";
import type { SkillDraftInput } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const user = await requireCurrentUser();
    const existing = await findSkill(slug, user);
    const body = (await request.json()) as Partial<SkillDraftInput> & PublicPublishGateBody;
    if (!existing && !body.skillMd) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    const current = existing ? latestVersion(existing) : undefined;
    const visibility = body.visibility ?? existing?.visibility ?? "public";
    const permissions = body.permissions ?? existing?.permissions.map((permission) => permission.key) ?? ["read_files"];
    const skillMd = body.skillMd ?? current?.skillMd ?? "";

    if (visibility === "public") {
      const blocked = enforcePublicPublishGate(
        {
          ...body,
          skillMd,
          name: body.name ?? existing?.name ?? slug,
          slug,
          category: body.category ?? existing?.category ?? "Automation",
          summary: body.summary ?? existing?.summary ?? "Published skill version.",
          permissions,
          compatibilityTargets: body.compatibilityTargets ?? current?.compatibilityTargets ?? ["Codex", "Claude", "VS Code"],
        },
        permissions,
      );
      if (blocked) return blocked;
    }

    const skill = await createOrUpdateSkill(
      {
        name: body.name ?? existing?.name ?? slug,
        slug,
        category: body.category ?? existing?.category ?? "Automation",
        summary: body.summary ?? existing?.summary ?? "Published skill version.",
        skillMd,
        permissions,
        compatibilityTargets: body.compatibilityTargets ?? current?.compatibilityTargets ?? ["Codex", "Claude", "VS Code"],
        visibility,
      },
      user,
    );
    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: "Version publish failed." }, { status: 400 });
  }
}
