import { NextResponse } from "next/server";
import { parseSkillMarkdown } from "@/lib/skill-import";

export async function POST(request: Request) {
  const body = (await request.json()) as { skillMd?: string };
  return NextResponse.json(parseSkillMarkdown(body.skillMd ?? ""));
}
