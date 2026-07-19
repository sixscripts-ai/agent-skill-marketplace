"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Download, Play, ShieldCheck, Star } from "lucide-react";
import {
  FirebenchCta,
  FirebenchHeroCard,
  FirebenchHeroIntro,
  FirebenchPage,
  FirebenchTag,
} from "@/components/firebench";
import type { Skill, SkillVersion } from "@/lib/types";
import "@/app/firebench.css";
import "@/app/skill-workspace.css";

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
    <FirebenchPage heat="soft" className="sw-page">
      <FirebenchHeroIntro
        kicker="skill package"
        title={skill.name}
        lead={skill.summary}
      />

      <div className="fb-tags" style={{ justifyContent: "center" }}>
        <FirebenchTag>{skill.category}</FirebenchTag>
        <FirebenchTag>{skill.trustLevel}</FirebenchTag>
        <span className="sw-chip sw-chip--muted">v{skill.currentVersion}</span>
        {skill.visibility ? <span className="sw-chip sw-chip--muted">{skill.visibility}</span> : null}
        <span className="sw-chip sw-chip--muted">{skill.author}</span>
      </div>

      <FirebenchHeroCard
        actionsLeft={
          <>
            <FirebenchCta href={`/skills/${skill.slug}/run?mode=autopilot`}>
              <Play className="size-4" aria-hidden="true" />
              Run skill
            </FirebenchCta>
            <FirebenchCta href={`/install/${skill.slug}`} variant="ghost">
              <Download className="size-4" aria-hidden="true" />
              Install
            </FirebenchCta>
            <FirebenchCta href={`/builder/${skill.slug}`} variant="ghost">
              Edit in builder
            </FirebenchCta>
          </>
        }
        actionsRight={
          <FirebenchCta href="/skills" variant="ghost">
            My Skills
          </FirebenchCta>
        }
      >
        <div className="sw-metrics">
          <Metric label="Evaluation score" value={`${latestScore}%`} />
          <Metric label="Rating" value={skill.rating.toFixed(1)} icon={<Star className="size-4" aria-hidden="true" />} />
          <Metric label="Installs" value={skill.installCount.toLocaleString()} />
          <Metric label="Compatibility" value={`${targets.length} targets`} />
        </div>
      </FirebenchHeroCard>

      <div className="sw-tabs" role="tablist" aria-label="Skill details">
        <Tab active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
          Overview
        </Tab>
        <Tab active={activeTab === "code"} onClick={() => setActiveTab("code")}>
          README &amp; Code
        </Tab>
        <Tab active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")}>
          Reviews ({reviews.length})
        </Tab>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <section className="sw-panel">
            <div className="sw-panel__head">
              <div>
                <h2 className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[var(--sw-heat)]" aria-hidden="true" />
                  Required permissions
                </h2>
                <p>Review what this skill may access before running or installing it.</p>
              </div>
            </div>
            <div className="sw-panel__pad flex flex-col gap-3">
              {permissions.map((permission) => (
                <div key={permission.key} className="sw-perm">
                  <div className="flex items-start justify-between gap-3">
                    <code>{permission.key}</code>
                    <span
                      className={
                        permission.risk === "high"
                          ? "sw-chip sw-chip--danger"
                          : permission.risk === "medium"
                            ? "sw-chip sw-chip--warn"
                            : "sw-chip sw-chip--ok"
                      }
                    >
                      {permission.risk} risk
                    </span>
                  </div>
                  <p>{permission.reason}</p>
                </div>
              ))}
              {permissions.length === 0 ? <p className="text-sm text-[var(--sw-muted)]">No permissions declared.</p> : null}
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="sw-panel">
              <div className="sw-panel__head">
                <div>
                  <h2>Compatibility</h2>
                  <p>Install targets for this package.</p>
                </div>
              </div>
              <div className="sw-panel__pad flex flex-wrap gap-2">
                {targets.map((target) => (
                  <span key={target} className="sw-chip sw-chip--muted">
                    {target}
                  </span>
                ))}
                {targets.length === 0 ? <p className="text-sm text-[var(--sw-muted)]">No targets listed.</p> : null}
              </div>
            </section>

            <section className="sw-panel">
              <div className="sw-panel__head">
                <div>
                  <h2>Inspect this skill</h2>
                  <p>Versions, evals, and dependency map.</p>
                </div>
              </div>
              <div className="sw-panel__pad flex flex-col">
                <DetailLink href={`/skills/${skill.slug}/versions`} label="Version history and diffs" />
                <DetailLink href={`/skills/${skill.slug}/evals`} label="Evaluation suites" />
                <DetailLink href={`/skills/${skill.slug}/graph`} label="Dependency map" />
                <DetailLink href={`/terminal?skill=${skill.slug}`} label="Open in live terminal" />
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === "code" ? (
        <section className="sw-panel">
          <div className="sw-panel__head">
            <div>
              <h2>Package source</h2>
              <p>README and SKILL.md for the current version.</p>
            </div>
          </div>
          <div className="sw-panel__pad">
            <h3 className="m-0 text-base font-semibold">README</h3>
            <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm leading-7 text-[var(--sw-muted)]">{version.readme}</p>
            <h3 className="mt-8 m-0 text-base font-semibold">SKILL.md</h3>
            <pre className="sw-code mt-3">{version.skillMd}</pre>
          </div>
        </section>
      ) : null}

      {activeTab === "reviews" ? (
        <section className="sw-panel">
          <div className="sw-panel__head">
            <div>
              <h2>Reviews</h2>
              <p>Community feedback for this skill.</p>
            </div>
          </div>
          <div className="sw-panel__pad flex flex-col gap-3">
            {reviews.map((review, index) => (
              <article key={`${review.user}-${index}`} className="sw-perm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{review.user}</span>
                  <span className="inline-flex items-center gap-1 text-sm text-[var(--sw-muted)]">
                    <Star className="size-4" aria-hidden="true" />
                    {review.rating.toFixed(1)}
                  </span>
                </div>
                <p>{review.comment}</p>
              </article>
            ))}
            {reviews.length === 0 ? <p className="text-sm text-[var(--sw-muted)]">No reviews yet.</p> : null}
          </div>
        </section>
      ) : null}
    </FirebenchPage>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="sw-metric">
      <strong>
        {icon}
        {value}
      </strong>
      <span>{label}</span>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={active} data-active={active} className="sw-tab" onClick={onClick}>
      {children}
    </button>
  );
}

function DetailLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="sw-list-link">
      {label}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
