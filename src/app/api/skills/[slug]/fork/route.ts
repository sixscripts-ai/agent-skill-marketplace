import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { forkSkill } from "@/lib/repository";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const user = await requireCurrentUser();
    const fork = await forkSkill(slug, user);
    return NextResponse.json(fork, { status: 201 });
  } catch (error) {
    const securityResponse = securityErrorResponse(error);
    if (securityResponse) return securityResponse;
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }
}
