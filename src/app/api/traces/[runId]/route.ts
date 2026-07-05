import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { findRun } from "@/lib/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { runId } = await params;
    const persisted = await findRun(runId, user);
    if (persisted) {
      return NextResponse.json({
        ...persisted,
        requestedRunId: runId,
        exportFormat: "agent-skill-trace.v2",
      });
    }
    return NextResponse.json({ error: "Trace not found", requestedRunId: runId }, { status: 404 });
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: "Trace export failed" }, { status: 400 });
  }
}
