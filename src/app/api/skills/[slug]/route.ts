import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { latestVersion } from "@/lib/data";
import { enforcePublicPublishGate, type PublicPublishGateBody } from "@/lib/marketplace-forge/enforce-public-publish";
import { createOrUpdateSkill, findSkill } from "@/lib/repository";
import type { SkillDraftInput } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const user = await requireCurrentUser();
    const existing = await findSkill(slug, user);
    if (!existing) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    const body = (await request.json()) as Partial<SkillDraftInput> & PublicPublishGateBody;
    const version = latestVersion(existing);
    const visibility = body.visibility ?? existing.visibility ?? "public";
    const permissions = body.permissions ?? existing.permissions.map((permission) => permission.key);
    const skillMd = body.skillMd ?? version.skillMd;

    if (visibility === "public" && existing.visibility !== "public") {
      const blocked = enforcePublicPublishGate(
        {
          ...body,
          skillMd,
          name: body.name ?? existing.name,
          slug,
          category: body.category ?? existing.category,
          summary: body.summary ?? existing.summary,
          permissions,
          compatibilityTargets: body.compatibilityTargets ?? version.compatibilityTargets,
        },
        permissions,
      );
      if (blocked) return blocked;
    }

    const skill = await createOrUpdateSkill(
      {
        name: body.name ?? existing.name,
        slug,
        category: body.category ?? existing.category,
        summary: body.summary ?? existing.summary,
        skillMd,
        permissions,
        compatibilityTargets: body.compatibilityTargets ?? version.compatibilityTargets,
        visibility,
      },
      user,
    );
    return NextResponse.json(skill);
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: "Skill update failed." }, { status: 400 });
  }
}
