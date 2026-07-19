import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SkillDetailClient } from "@/components/skill-detail-client";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";
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

export default async function SkillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = await findSkill(slug, await getCurrentUser());
  if (!skill) notFound();

  const version = latestVersion(skill);
  const latestScore = skill.evalSuites?.[0]?.results?.[0]?.score ?? 0;

  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <div className="sw-page mb-2">
        <Link href="/skills" className="sw-back">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to My Skills
        </Link>
      </div>
      <SkillDetailClient skill={skill} version={version} latestScore={latestScore} />
    </AppShell>
  );
}
