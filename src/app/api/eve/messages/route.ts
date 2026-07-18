import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { appendEveMessage } from "@/lib/eve/persistence";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { projectId: string; role: "user" | "assistant"; content: string; metadata?: Record<string, unknown> };
    return NextResponse.json(await appendEveMessage(body.projectId, user, body.role, body.content, body.metadata), { status: 201 });
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Message save failed." }, { status: 400 });
  }
}
