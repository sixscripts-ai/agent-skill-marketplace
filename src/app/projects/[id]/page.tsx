import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { BuilderClient } from "@/components/builder-client";
import { BuilderRuntimeBridge } from "@/components/builder-runtime-bridge";
import { EveProjectRail } from "@/components/builder/eve-project-rail";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";

export const metadata: Metadata = {
  title: "Project Build | Agent Skill Marketplace",
  description: "Edit, prove, and ship a skill project with Eve as a project copilot rail.",
};

export default async function ProjectBuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skill = await findSkill(id, await getCurrentUser());
  if (!skill) notFound();
  const version = latestVersion(skill);

  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <BuilderRuntimeBridge>
        <div className="builder-project-split">
          <div className="builder-project-main">
            <BuilderClient
              initialDraft={{
                name: skill.name,
                slug: skill.slug,
                category: skill.category,
                summary: skill.summary,
                skillMd: version.skillMd,
                permissions: skill.permissions.map((permission) => permission.key),
                compatibilityTargets: version.compatibilityTargets,
                visibility: skill.visibility ?? "private",
                status: skill.status,
              }}
            />
          </div>
          <EveProjectRail skillSlug={skill.slug} skillName={skill.name} />
        </div>
      </BuilderRuntimeBridge>
    </AppShell>
  );
}
