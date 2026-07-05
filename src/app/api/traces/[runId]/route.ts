import { NextResponse } from "next/server";
import { skills } from "@/lib/data";
import { buildMockRun } from "@/lib/runner";
import { findRun, saveRun } from "@/lib/repository";

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
  const skill = skills.find((item) => runId.startsWith(item.slug)) ?? skills[0];
  const run = buildMockRun(skill.slug, "Exported trace replay from API route.");
  await saveRun(run);

  return NextResponse.json({
    ...run,
    requestedRunId: runId,
    exportFormat: "agent-skill-trace.v2",
  });
}
