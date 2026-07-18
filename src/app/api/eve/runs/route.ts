import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createEveRun, updateEveRun } from "@/lib/eve/persistence";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { projectId: string; prompt: string; model: string };
    return NextResponse.json(await createEveRun(body.projectId, user, body.prompt, body.model), { status: 201 });
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Run creation failed." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { runId: string; status?: string; currentBatch?: number; error?: string | null; event?: { type: string; status: string; title: string; detail?: string } };
    const { runId, ...data } = body;
    return NextResponse.json(await updateEveRun(runId, user, data));
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Run update failed." }, { status: 400 });
  }
}
