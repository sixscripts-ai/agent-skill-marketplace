import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { forkSkill } from "@/lib/repository";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();

  try {
    const fork = await forkSkill(slug, user);
    return NextResponse.json(fork, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }
}
