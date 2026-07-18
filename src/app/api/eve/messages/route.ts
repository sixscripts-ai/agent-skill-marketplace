import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { appendEveMessage } from "@/lib/eve/persistence";
import { redactSecrets } from "@/lib/eve/secrets";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { projectId: string; role: "user" | "assistant"; content: string; metadata?: Record<string, unknown> };
    return NextResponse.json(await appendEveMessage(body.projectId, user, body.role, redactSecrets(body.content ?? ""), body.metadata), { status: 201 });
  } catch (error) {
    console.error("[eve-messages]", { requestId, error: error instanceof Error ? error.message : String(error) });
    return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Message save failed.", requestId }, { status: 400 });
  }
}
