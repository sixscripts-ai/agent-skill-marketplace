import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { LiveTerminalClient } from "@/components/live-terminal-client";
import { getCurrentUser } from "@/lib/auth";
import { listVisibleSkills } from "@/lib/repository";
import { getSandboxReadiness } from "@/lib/sandbox-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Terminal | Agent Skill Marketplace",
  description: "Browser sandbox console for streaming real-shell and agent skill runs.",
};

export default async function TerminalPage({
  searchParams,
}: {
  searchParams?: Promise<{ skill?: string }>;
}) {
  const user = await getCurrentUser();
  const skills = await listVisibleSkills(user);
  const params = searchParams ? await searchParams : {};

  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <LiveTerminalClient
        skills={skills}
        readiness={getSandboxReadiness()}
        initialSkillSlug={params.skill}
      />
    </AppShell>
  );
}
