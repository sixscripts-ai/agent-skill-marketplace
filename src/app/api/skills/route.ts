import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrUpdateSkill } from "@/lib/repository";
import type { SkillDraftInput } from "@/lib/types";

export async function POST(request: Request) {
  const input = (await request.json()) as SkillDraftInput;
  const user = await getCurrentUser();
  const skill = await createOrUpdateSkill(input, user);
  return NextResponse.json(skill, { status: 201 });
}
