import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrUpdateSkill } from "@/lib/repository";
import type { SkillDraftInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as SkillDraftInput;
    const user = await getCurrentUser();
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Skill save failed." },
      { status: 400 },
    );
  }
}
