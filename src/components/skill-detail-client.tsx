"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Download, Play, ShieldCheck, Star } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Badge, Panel } from "@/components/ui";
import type { Skill, SkillVersion } from "@/lib/types";

type DetailTab = "overview" | "code" | "reviews";

export function SkillDetailClient({
  skill,
  version,
  latestScore,
}: {
  skill: Skill;
  version: SkillVersion;
  latestScore: number;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const permissions = skill.permissions ?? [];
  const reviews = skill.reviews ?? [];
  const targets = version.compatibilityTargets ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Panel className="p-6 md:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">{skill.category}</Badge>
              <Badge tone={skill.trustLevel === "Verified" ? "green" : skill.trustLevel === "Reviewed" ? "blue" : "amber"}>
                {skill.trustLevel}
              </Badge>
              <Badge tone="neutral">v{skill.currentVersion}</Badge>
              {skill.visibility ? <Badge tone="neutral">{skill.visibility}</Badge> : null}
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">{skill.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">{skill.summary}</p>
            <p className="mt-4 text-sm text-muted-foreground">Published by {skill.author}</p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col xl:flex-row">
            <Link
              href={`/skills/${skill.slug}/run?mode=autopilot`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--primary-hover)]"
            >
              <Play className="size-4" aria-hidden="true" />
              Run skill
            </Link>
            <Link
              href={`/install/${skill.slug}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Download className="size-4" aria-hidden="true" />
              Install
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Evaluation score" value={`${latestScore}%`} />
          <Metric label="Rating" value={skill.rating.toFixed(1)} icon={<Star className="size-4" aria-hidden="true" />} />
          <Metric label="Installs" value={skill.installCount.toLocaleString()} />
          <Metric label="Compatibility" value={`${targets.length} targets`} />
        </div>
      </Panel>

      <div className="flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Skill details">
        <Tab active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>Overview</Tab>
        <Tab active={activeTab === "code"} onClick={() => setActiveTab("code")}>README &amp; Code</Tab>
        <Tab active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")}>Reviews ({reviews.length})</Tab>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <Panel className="p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">Required permissions</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Review what this skill may access before running or installing it.</p>
            <div className="mt-5 flex flex-col gap-3">
              {permissions.map((permission) => (
                <div key={permission.key} className="rounded-md border border-border bg-muted/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <code className="font-mono text-sm font-semibold text-foreground">{permission.key}</code>
                    <Badge tone={permission.risk === "high" ? "red" : permission.risk === "medium" ? "amber" : "green"}>
                      {permission.risk} risk
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{permission.reason}</p>
                </div>
              ))}
              {permissions.length === 0 ? <p className="text-sm text-muted-foreground">No permissions declared.</p> : null}
            </div>
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel className="p-6">
              <h2 className="text-lg font-semibold text-foreground">Compatibility</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {targets.map((target) => <Badge key={target} tone="neutral">{target}</Badge>)}
              </div>
            </Panel>

            <Panel className="p-6">
              <h2 className="text-lg font-semibold text-foreground">Inspect this skill</h2>
              <div className="mt-4 flex flex-col divide-y divide-border">
                <DetailLink href={`/skills/${skill.slug}/versions`} label="Version history and diffs" />
                <DetailLink href={`/skills/${skill.slug}/evals`} label="Evaluation suites" />
                <DetailLink href={`/skills/${skill.slug}/graph`} label="Dependency map" />
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === "code" ? (
        <Panel className="p-6 md:p-8">
          <h2 className="text-xl font-semibold text-foreground">README</h2>
          <p className="mt-4 max-w-4xl whitespace-pre-wrap text-base leading-7 text-muted-foreground">{version.readme}</p>
          <h2 className="mt-10 text-xl font-semibold text-foreground">SKILL.md</h2>
          <div className="mt-4"><CodeBlock code={version.skillMd} /></div>
        </Panel>
      ) : null}

      {activeTab === "reviews" ? (
        <Panel className="p-6">
          <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
          <div className="mt-5 flex flex-col gap-3">
            {reviews.map((review, index) => (
              <article key={`${review.user}-${index}`} className="rounded-md border border-border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">{review.user}</span>
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Star className="size-4" aria-hidden="true" />{review.rating.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>
              </article>
            ))}
            {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No reviews yet.</p> : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-xl font-semibold text-foreground">{icon}{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function DetailLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-foreground transition hover:text-primary">
      {label}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
