import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DependencyGraph } from "@/components/dependency-graph";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";

export default async function SkillGraphPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = await findSkill(slug, await getCurrentUser());
  if (!skill) notFound();

  return (
    <AppShell>
      <DependencyGraph skill={skill} />
    </AppShell>
  );
}
