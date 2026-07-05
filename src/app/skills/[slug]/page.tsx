import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import { ForkSkillButton } from "@/components/fork-skill-button";
import { Badge, ButtonLink, Metric, Panel } from "@/components/ui";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";

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
  const latestScore = skill.evalSuites[0]?.results[0]?.score ?? 0;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Panel className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{skill.category}</Badge>
                  <Badge tone={skill.trustLevel === "Verified" ? "green" : "amber"}>{skill.trustLevel}</Badge>
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-neutral-950">{skill.name}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600">{skill.summary}</p>
              </div>
              <div className="flex gap-3">
                <ButtonLink href={`/skills/${skill.slug}/run`}>Run Skill</ButtonLink>
                <ButtonLink href={`/install/${skill.slug}`} variant="secondary">Install</ButtonLink>
                <ForkSkillButton slug={skill.slug} />
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-5 border-t border-neutral-200 pt-6 sm:grid-cols-4">
              <Metric label="version" value={skill.currentVersion} />
              <Metric label="eval score" value={`${latestScore}%`} />
              <Metric label="rating" value={skill.rating.toFixed(1)} />
              <Metric label="installs" value={skill.installCount.toLocaleString()} />
            </div>
          </Panel>
          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Required permissions</h2>
            <div className="mt-4 flex flex-col gap-3">
              {skill.permissions.map((permission) => (
                <div key={permission.key} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-neutral-950">{permission.key}</span>
                    <Badge tone={permission.risk === "high" ? "red" : permission.risk === "medium" ? "amber" : "green"}>
                      {permission.risk}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-neutral-600">{permission.reason}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">README</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">{version.readme}</p>
            <h2 className="mt-8 font-semibold text-neutral-950">SKILL.md</h2>
            <div className="mt-3">
              <CodeBlock code={version.skillMd} />
            </div>
          </Panel>
          <div className="flex flex-col gap-6">
            <Panel className="p-5">
              <h2 className="font-semibold text-neutral-950">Compatibility</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {version.compatibilityTargets.map((target) => (
                  <Badge key={target}>{target}</Badge>
                ))}
              </div>
            </Panel>
            <Panel className="p-5">
              <h2 className="font-semibold text-neutral-950">Project links</h2>
              <div className="mt-4 grid gap-3">
                <Link className="text-sm font-medium text-neutral-950 underline underline-offset-4" href={`/skills/${skill.slug}/versions`}>
                  Version history and diff
                </Link>
                <Link className="text-sm font-medium text-neutral-950 underline underline-offset-4" href={`/skills/${skill.slug}/evals`}>
                  Evaluation suites
                </Link>
                <Link className="text-sm font-medium text-neutral-950 underline underline-offset-4" href={`/skills/${skill.slug}/graph`}>
                  Dependency graph
                </Link>
                <Link className="text-sm font-medium text-neutral-950 underline underline-offset-4" href={`/install/${skill.slug}`}>
                  Export install package
                </Link>
              </div>
            </Panel>
            <Panel className="p-5">
              <h2 className="font-semibold text-neutral-950">Reviews</h2>
              <div className="mt-4 flex flex-col gap-3">
                {skill.reviews.map((review) => (
                  <div key={review.comment} className="text-sm leading-6 text-neutral-600">
                    <span className="font-semibold text-neutral-950">{review.user}</span>: {review.comment}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
