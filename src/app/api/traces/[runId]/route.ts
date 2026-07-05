import { NextResponse } from "next/server";
import { findRun } from "@/lib/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const persisted = await findRun(runId);
  if (persisted) {
    return NextResponse.json({
      ...persisted,
      requestedRunId: runId,
      exportFormat: "agent-skill-trace.v2",
    });
  }
  return NextResponse.json({ error: "Trace not found", requestedRunId: runId }, { status: 404 });
}
