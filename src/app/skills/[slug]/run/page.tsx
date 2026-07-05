import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RunnerClient } from "@/components/runner-client";
import { getCurrentUser } from "@/lib/auth";
import { findRun, findSkill } from "@/lib/repository";

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
  const initialRun = replay ? await findRun(replay) : undefined;

  return (
    <AppShell>
      <RunnerClient skill={skill} initialRun={initialRun} />
    </AppShell>
  );
}
