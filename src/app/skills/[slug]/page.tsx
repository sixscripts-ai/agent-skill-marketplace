import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";
import type { Skill } from "@/lib/types";
import { SkillDetailClient } from "@/components/skill-detail-client";

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
  const version = latestVersion(skill) || { readme: "No README available.", skillMd: "No SKILL.md available.", compatibilityTargets: [] } as any;
  const latestScore = skill.evalSuites?.[0]?.results?.[0]?.score ?? 0;

  return (
    <div className="marketplace-cyber min-h-screen bg-[#0f1729] pt-10 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Navigation / Header */}
        <div className="mb-6">
          <Link href="/marketplace" className="inline-flex items-center text-sm font-medium text-gray-400 transition hover:text-cyan-400">
            <span className="mr-2">←</span> Back to Marketplace
          </Link>
        </div>

        <SkillDetailClient skill={skill} version={version} latestScore={latestScore} />
      </div>
    </div>
  );
}
