import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser, isAuthenticatedUser } from "@/lib/auth";
import { listOwnedSkills, listVisibleSkills } from "@/lib/repository";
import { MySkillsClient } from "@/components/my-skills-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects | Agent Skill Marketplace",
  description: "Owner library for managing skill project lifecycle, edits, and sandboxed runs.",
};

export default async function ProjectsIndexPage() {
  const user = await getCurrentUser();
  if (!isAuthenticatedUser(user)) redirect("/sign-in");
  const skills = user.role === "admin" ? await listVisibleSkills(user) : await listOwnedSkills(user);

  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <MySkillsClient skills={skills} />
    </AppShell>
  );
}
