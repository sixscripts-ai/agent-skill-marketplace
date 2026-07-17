import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeBlock } from "@/components/code-block";
import { ForkSkillButton } from "@/components/fork-skill-button";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";
import type { Skill } from "@/lib/types";

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

function CyberBadge({ tone = "green", children }: { tone?: "green" | "amber" | "red" | "blue" | "neutral"; children: React.ReactNode }) {
  const toneClass =
    tone === "green" ? "cyber-badge" :
    tone === "amber" ? "cyber-badge cyber-badge-amber" :
    tone === "red" ? "cyber-badge cyber-badge-red" :
    tone === "blue" ? "cyber-badge cyber-badge-blue" :
    "cyber-badge cyber-badge-neutral";
  return <span className={`${toneClass} inline-flex h-6 items-center px-3 text-xs`}>{children}</span>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="truncate text-xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gray-500">{label}</div>
    </div>
  );
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

        <div className="flex flex-col gap-6">
          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Main Header Card */}
            <div className="cyber-card p-6 md:p-10">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    <CyberBadge tone="blue">{skill.category}</CyberBadge>
                    <CyberBadge tone={skill.trustLevel === "Verified" ? "green" : "amber"}>{skill.trustLevel}</CyberBadge>
                  </div>
                  <h1 className="font-mono text-4xl font-semibold tracking-tight text-white md:text-5xl">{skill.name}</h1>
                  <p className="max-w-3xl text-base leading-7 text-gray-400">{skill.summary}</p>
                </div>
                
                {/* Actions */}
                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row md:flex-col lg:flex-row">
                  <Link href={`/skills/${skill.slug}/run?mode=autopilot`} className="cyber-btn-primary flex h-11 items-center justify-center px-6 text-sm font-semibold whitespace-nowrap">
                    ⚡ Quick Run
                  </Link>
                  <Link href={`/install/${skill.slug}`} className="cyber-btn-secondary flex h-11 items-center justify-center px-6 text-sm font-semibold whitespace-nowrap">
                    Install Code
                  </Link>
                </div>
              </div>

              {/* Metrics */}
              <div className="cyber-inset mt-10 grid grid-cols-2 gap-5 p-6 sm:grid-cols-4">
                <MiniMetric label="version" value={skill.currentVersion} />
                <MiniMetric label="eval score" value={`${latestScore}%`} />
                <MiniMetric label="rating" value={skill.rating.toFixed(1)} />
                <MiniMetric label="installs" value={skill.installCount.toLocaleString()} />
              </div>
            </div>

            {/* Permissions Panel */}
            <div className="cyber-card p-6">
              <h2 className="font-semibold text-white">Required Permissions</h2>
              <div className="mt-6 flex flex-col gap-3">
                {(Array.isArray(skill.permissions) ? skill.permissions : (skill.permissions ? [skill.permissions] : [])).map((permission) => (
                    <div key={permission.key} className="cyber-inset p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-sm font-medium text-white">{permission.key}</span>
                        <CyberBadge tone={permission.risk === "high" ? "red" : permission.risk === "medium" ? "amber" : "green"}>
                          {permission.risk}
                        </CyberBadge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{permission.reason}</p>
                    </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* README & Code */}
            <div className="cyber-card p-6 md:p-10">
              <h2 className="text-xl font-semibold text-white">README</h2>
              <p className="mt-4 text-base leading-7 text-gray-400">{version.readme}</p>
              
              <h2 className="mt-12 text-xl font-semibold text-white">SKILL.md</h2>
              <div className="mt-4">
                <CodeBlock code={version.skillMd} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-6">
              
              <div className="cyber-card p-6">
                <h2 className="font-semibold text-white">Compatibility</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(Array.isArray(version.compatibilityTargets) ? version.compatibilityTargets : (version.compatibilityTargets ? [version.compatibilityTargets] : [])).map((target: string) => (
                    <CyberBadge key={target} tone="neutral">{target}</CyberBadge>
                  ))}
                </div>
              </div>

              <div className="cyber-card p-6">
                <h2 className="font-semibold text-white">Project Links</h2>
                <div className="mt-4 flex flex-col gap-4">
                  <Link className="text-sm font-medium text-cyan-400 underline-offset-4 hover:underline" href={`/skills/${skill.slug}/versions`}>
                    Version history & diffs
                  </Link>
                  <Link className="text-sm font-medium text-cyan-400 underline-offset-4 hover:underline" href={`/skills/${skill.slug}/evals`}>
                    Evaluation suites
                  </Link>
                  <Link className="text-sm font-medium text-cyan-400 underline-offset-4 hover:underline" href={`/skills/${skill.slug}/graph`}>
                    Dependency graph
                  </Link>
                </div>
              </div>

              <div className="cyber-card p-6">
                <h2 className="font-semibold text-white">Reviews</h2>
                <div className="mt-4 flex flex-col gap-4">
                  {(Array.isArray(skill.reviews) ? skill.reviews : (skill.reviews ? [skill.reviews] : [])).map((review) => (
                    <div key={review.comment} className="cyber-inset p-4">
                      <span className="font-mono text-sm font-semibold text-white">{review.user}</span>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
