import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RunnerClient } from "@/components/runner-client";
import { getCurrentUser } from "@/lib/auth";
import { findLatestRunForSkill, findRun, findSkill } from "@/lib/repository";
import { createPendingRun, workspaceFilesFromSkillPackages } from "@/lib/run-state";
import { getSandboxReadiness } from "@/lib/sandbox-status";
import type { ExecutionMode } from "@/lib/types";

export default async function SkillRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ replay?: string; mode?: string }>;
}) {
  const { slug } = await params;
  const { replay, mode } = await searchParams;
  const user = await getCurrentUser();
  const skill = await findSkill(slug, user);
  if (!skill) notFound();
  const replayedRun = replay ? await findRun(replay, user) : undefined;
  if (replay && !replayedRun) notFound();
  const latestRun = replayedRun ? undefined : await findLatestRunForSkill(skill.slug, user);
  const initialRun = replayedRun ?? latestRun ?? createPendingRun(skill, workspaceFilesFromSkillPackages(skill));
  const initialMode = (mode === "autopilot" ? "autopilot" : undefined) as ExecutionMode | undefined;

  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <RunnerClient skill={skill} initialRun={initialRun} sandboxReadiness={getSandboxReadiness()} initialMode={initialMode} />
    </AppShell>
  );
}
