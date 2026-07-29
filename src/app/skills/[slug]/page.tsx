import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SkillStudioClient } from "@/components/skill-studio-client";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { findLatestRunForSkill, findRun, findSkill } from "@/lib/repository";
import { createPendingRun, workspaceFilesFromSkillPackages } from "@/lib/run-state";
import { getSandboxReadiness } from "@/lib/sandbox-status";
import type { ExecutionMode } from "@/lib/types";
import { notFound } from "next/navigation";
import "@/app/firebench.css";
import "@/app/skill-workspace.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const skill = await findSkill(slug, await getCurrentUser());
  if (!skill) return { title: "Skill Not Found" };
  return {
    title: skill.name,
    description: skill.summary,
    openGraph: {
      title: `${skill.name} | Agent Skill Marketplace`,
      description: skill.summary,
    },
  };
}

export default async function SkillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ stage?: string; evidence?: string; replay?: string; mode?: string }>;
}) {
  const { slug } = await params;
  const { replay, mode } = await searchParams;
  const user = await getCurrentUser();
  const skill = await findSkill(slug, user);
  if (!skill) notFound();

  const version = latestVersion(skill);
  const latestScore = skill.evalSuites?.[0]?.results?.[0]?.score ?? 0;
  const replayedRun = replay ? await findRun(replay, user) : undefined;
  if (replay && !replayedRun) notFound();
  const latestRun = replayedRun ? undefined : await findLatestRunForSkill(skill.slug, user);
  const initialRun = replayedRun ?? latestRun ?? createPendingRun(skill, workspaceFilesFromSkillPackages(skill));
  const initialMode = (mode === "autopilot" ? "autopilot" : undefined) as ExecutionMode | undefined;

  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <div className="sw-page mb-2">
        <Link href="/marketplace" className="sw-back">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Marketplace
        </Link>
      </div>
      <Suspense fallback={<div className="sw-page p-6 text-sm text-[var(--sw-muted)]">Loading studio…</div>}>
        <SkillStudioClient
          skill={skill}
          version={version}
          latestScore={latestScore}
          initialRun={initialRun}
          sandboxReadiness={getSandboxReadiness()}
          initialMode={initialMode}
        />
      </Suspense>
    </AppShell>
  );
}
