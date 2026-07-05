import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RunnerClient } from "@/components/runner-client";
import { getCurrentUser } from "@/lib/auth";
import { findLatestRunForSkill, findRun, findSkill } from "@/lib/repository";
import { createPendingRun, workspaceFilesFromSkillPackages } from "@/lib/run-state";

export default async function SkillRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ replay?: string }>;
}) {
  const { slug } = await params;
  const { replay } = await searchParams;
  const skill = await findSkill(slug, await getCurrentUser());
  if (!skill) notFound();
  const replayedRun = replay ? await findRun(replay) : undefined;
  if (replay && !replayedRun) notFound();
  const latestRun = replayedRun ? undefined : await findLatestRunForSkill(skill.slug);
  const initialRun = replayedRun ?? latestRun ?? createPendingRun(skill, workspaceFilesFromSkillPackages(skill));

  return (
    <AppShell>
      <RunnerClient skill={skill} initialRun={initialRun} />
    </AppShell>
  );
}
