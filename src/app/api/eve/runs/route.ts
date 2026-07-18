import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createEveRun, updateEveRun } from "@/lib/eve/persistence";
import { redactErrorMessage } from "@/lib/eve/secrets";

function errorResponse(error: unknown, fallback: string, requestId = crypto.randomUUID()) {
  console.error("[eve-runs]", { requestId, error: error instanceof Error ? error.message : String(error) });
  return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? redactErrorMessage(error.message) : fallback, requestId }, { status: 400 });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { projectId: string; prompt: string; model: string };
    return NextResponse.json(await createEveRun(body.projectId, user, body.prompt, body.model), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Run creation failed.", requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { runId: string; status?: string; currentBatch?: number; error?: string | null; event?: { type: string; status: string; title: string; detail?: string; metadata?: Record<string, unknown> } };
    const { runId, ...data } = body;
    if (data.error) data.error = redactErrorMessage(data.error);
    if (data.event?.detail) data.event.detail = redactErrorMessage(data.event.detail);
    if (data.event) {
      data.event.metadata = { ...(data.event.metadata ?? {}), requestId: data.event.metadata?.requestId ?? requestId };
    }
    return NextResponse.json(await updateEveRun(runId, user, data));
  } catch (error) {
    return errorResponse(error, "Run update failed.", requestId);
  }
}
