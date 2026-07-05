import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TraceClient } from "@/components/trace-client";
import { getCurrentUser } from "@/lib/auth";
import { findRun } from "@/lib/repository";

export default async function TracePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await findRun(runId, await getCurrentUser());
  if (!run) notFound();

  return (
    <AppShell>
      <TraceClient run={run} />
    </AppShell>
  );
}
