import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EvalsClient } from "@/components/evals-client";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";

export default async function EvalsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = await findSkill(slug, await getCurrentUser());
  if (!skill) notFound();

  return (
    <AppShell>
      <EvalsClient skill={skill} />
    </AppShell>
  );
}
