import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { listVisibleSkills } from "@/lib/repository";
import { MySkillsClient } from "@/components/my-skills-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Skills | Agent Skill Marketplace",
  description: "Dev library for managing and sandboxed-testing agent skills.",
};

export default async function MySkillsPage() {
  const user = await getCurrentUser();
  const skills = await listVisibleSkills(user);

  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <MySkillsClient skills={skills} />
    </AppShell>
  );
}
