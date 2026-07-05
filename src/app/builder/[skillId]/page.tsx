import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BuilderClient } from "@/components/builder-client";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";

export default async function EditBuilderPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  const skill = await findSkill(skillId, await getCurrentUser());
  if (!skill) notFound();
  const version = latestVersion(skill);

  return (
    <AppShell>
      <BuilderClient
        initialDraft={{
          name: skill.name,
          slug: skill.slug,
          category: skill.category,
          summary: skill.summary,
          skillMd: version.skillMd,
          permissions: skill.permissions.map((permission) => permission.key),
          compatibilityTargets: version.compatibilityTargets,
          visibility: skill.visibility ?? "public",
        }}
      />
    </AppShell>
  );
}
