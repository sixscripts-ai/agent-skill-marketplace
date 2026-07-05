import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createOrUpdateSkill } from "@/lib/repository";
import type { SkillDraftInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as SkillDraftInput;
    const user = await requireCurrentUser();
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
