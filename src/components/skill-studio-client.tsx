"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Package, Play, Share2, ShieldCheck, Star, TerminalSquare, X } from "lucide-react";
import {
  FirebenchButton,
  FirebenchCta,
  FirebenchHeroIntro,
  FirebenchPage,
  FirebenchTag,
} from "@/components/firebench";
import { DependencyGraph } from "@/components/dependency-graph";
import { EvalsClient } from "@/components/evals-client";
import { ForkSkillButton } from "@/components/fork-skill-button";
import { RunnerClient } from "@/components/runner-client";
import { SkillDistributionPanel } from "@/components/skill-distribution-panel";
import { SkillVersionsPanel } from "@/components/skill-versions-panel";
import type { SandboxReadiness } from "@/lib/sandbox-status";
import type { ExecutionMode, Skill, SkillRun, SkillVersion } from "@/lib/types";
import "@/app/firebench.css";
import "@/app/skill-workspace.css";

export type StudioStage = "package" | "sandbox" | "distribution";
export type StudioEvidence = "versions" | "evals" | "graph" | null;

const STAGE_COPY: Record<StudioStage, string> = {
  package: "Permissions, source, and what this skill claims to do.",
  sandbox: "Approve, run, and read the trace.",
  distribution: "Export for Claude, Codex, Cursor, and friends.",
};

function parseStage(value: string | null): StudioStage {
  if (value === "sandbox" || value === "distribution" || value === "package") return value;
  return "package";
}

function parseEvidence(value: string | null): StudioEvidence {
  if (value === "versions" || value === "evals" || value === "graph") return value;
  return null;
}

export function SkillStudioClient({
  skill,
  version,
  latestScore,
  initialRun,
  sandboxReadiness,
  initialMode,
}: {
  skill: Skill;
  version: SkillVersion;
  latestScore: number;
  initialRun: SkillRun;
  sandboxReadiness: SandboxReadiness;
  initialMode?: ExecutionMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const stage = parseStage(searchParams.get("stage"));
  const evidence = parseEvidence(searchParams.get("evidence"));
  const [bridgeVisible, setBridgeVisible] = useState(false);
  const [bridgeDismissed, setBridgeDismissed] = useState(false);

  const permissions = skill.permissions ?? [];
  const reviews = skill.reviews ?? [];
  const targets = version.compatibilityTargets ?? [];
  const compact = stage === "sandbox";

  const setStudioQuery = useCallback(
    (next: { stage?: StudioStage; evidence?: StudioEvidence; mode?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.stage) params.set("stage", next.stage);
      if (next.evidence === null) params.delete("evidence");
      else if (next.evidence) params.set("evidence", next.evidence);
      if (next.mode === null) params.delete("mode");
      else if (next.mode) params.set("mode", next.mode);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const goStage = useCallback(
    (next: StudioStage) => {
      setStudioQuery({ stage: next, evidence: null });
    },
    [setStudioQuery],
  );

  const openEvidence = useCallback(
    (item: Exclude<StudioEvidence, null>) => {
      setStudioQuery({ evidence: item });
    },
    [setStudioQuery],
  );

  const onRunComplete = useCallback((run: SkillRun) => {
    if (run.status === "complete") {
      setBridgeDismissed(false);
      setBridgeVisible(true);
    }
  }, []);

  const evidenceTitle = useMemo(() => {
    if (evidence === "versions") return "Version history";
    if (evidence === "evals") return "Evaluation suites";
    if (evidence === "graph") return "Dependency map";
    return null;
  }, [evidence]);

  return (
    <FirebenchPage heat="soft" className={`sw-page sw-studio ${compact ? "sw-studio--compact" : ""}`}>
      {!compact ? (
        <>
          <FirebenchHeroIntro kicker="skill package" title={skill.name} lead={skill.summary} />
          <div className="fb-tags" style={{ justifyContent: "center" }}>
            <FirebenchTag>{skill.category}</FirebenchTag>
            <FirebenchTag>{skill.trustLevel}</FirebenchTag>
            <span className="sw-chip sw-chip--muted">v{skill.currentVersion}</span>
            {skill.visibility ? <span className="sw-chip sw-chip--muted">{skill.visibility}</span> : null}
            <span className="sw-chip sw-chip--muted">{skill.author}</span>
          </div>
          <div className="sw-trust-strip" aria-label="Trust metrics">
            {latestScore > 0 ? (
              <span>
                <b>{latestScore}%</b> eval
              </span>
            ) : null}
            {skill.rating > 0 ? (
              <span>
                <b>{skill.rating.toFixed(1)}</b> rating
              </span>
            ) : null}
            {skill.installCount > 0 ? (
              <span>
                <b>{skill.installCount.toLocaleString()}</b> installs
              </span>
            ) : null}
            {targets.length > 0 ? (
              <span>
                <b>{targets.length}</b> targets
              </span>
            ) : null}
          </div>
          <div className="sw-studio-actions">
            <FirebenchButton type="button" onClick={() => goStage("sandbox")} data-testid="studio-open-sandbox">
              <Play className="size-4" aria-hidden="true" />
              Open Sandbox
            </FirebenchButton>
            <FirebenchButton type="button" variant="ghost" onClick={() => goStage("distribution")} data-testid="studio-distribute">
              <Share2 className="size-4" aria-hidden="true" />
              Distribute
            </FirebenchButton>
            <ForkSkillButton slug={skill.slug} />
            <FirebenchCta href={`/projects/${skill.slug}`} variant="ghost">
              Edit in Build
            </FirebenchCta>
          </div>
        </>
      ) : (
        <div className="sw-studio-compact-bar">
          <div>
            <div className="sw-studio-compact-kicker">sandbox</div>
            <h1 className="sw-studio-compact-title">{skill.name}</h1>
            <p className="sw-studio-compact-sub">Approve once · run · read the stream</p>
          </div>
          <div className="sw-studio-compact-actions">
            <button type="button" className="sw-chip-btn" onClick={() => openEvidence("versions")}>
              Versions
            </button>
            <button type="button" className="sw-chip-btn" onClick={() => openEvidence("evals")}>
              Evals
            </button>
            <button type="button" className="sw-chip-btn" onClick={() => openEvidence("graph")}>
              Graph
            </button>
            <Link href={`/terminal?skill=${skill.slug}`} className="sw-chip-btn">
              Live Terminal
            </Link>
            <FirebenchCta href={`/projects/${skill.slug}`}>Edit in Build</FirebenchCta>
            <FirebenchButton type="button" variant="ghost" onClick={() => goStage("package")}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Package
            </FirebenchButton>
          </div>
        </div>
      )}

      <div className="sw-stages" role="tablist" aria-label="Skill studio stages">
        <StageTab active={stage === "package"} onClick={() => goStage("package")} icon={<Package className="size-3.5" aria-hidden="true" />}>
          Package
        </StageTab>
        <StageTab active={stage === "sandbox"} onClick={() => goStage("sandbox")} icon={<Play className="size-3.5" aria-hidden="true" />}>
          Sandbox
        </StageTab>
        <StageTab active={stage === "distribution"} onClick={() => goStage("distribution")} icon={<Share2 className="size-3.5" aria-hidden="true" />}>
          Distribution
        </StageTab>
      </div>
      {!compact ? <p className="sw-stage-sub">{STAGE_COPY[stage]}</p> : null}

      <div className={`sw-studio-layout${compact ? " sw-studio-layout--sandbox" : ""}`}>
        <div className="sw-studio-main min-w-0">
          {evidence ? (
            <section className="sw-panel" data-testid="studio-evidence-panel">
              <div className="sw-panel__head">
                <div>
                  <h2>{evidenceTitle}</h2>
                  <p>Secondary evidence for this package — not a separate destination.</p>
                </div>
                <FirebenchButton type="button" variant="ghost" onClick={() => setStudioQuery({ evidence: null })} aria-label="Close evidence">
                  <X className="size-4" aria-hidden="true" />
                  Close
                </FirebenchButton>
              </div>
              <div className="sw-panel__pad">
                {evidence === "versions" ? <SkillVersionsPanel skill={skill} /> : null}
                {evidence === "evals" ? <EvalsClient skill={skill} /> : null}
                {evidence === "graph" ? <DependencyGraph skill={skill} /> : null}
              </div>
            </section>
          ) : null}

          {!evidence && stage === "package" ? (
            <div className="flex flex-col gap-4">
              <section className="sw-panel">
                <div className="sw-panel__head">
                  <div>
                    <h2 className="inline-flex items-center gap-2">
                      <ShieldCheck className="size-4 text-[var(--sw-heat)]" aria-hidden="true" />
                      Contract
                    </h2>
                    <p>What this skill may access, and where it can install.</p>
                  </div>
                </div>
                <div className="sw-panel__pad grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.65fr)]">
                  <div className="flex flex-col gap-3">
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
                  <div>
                    <h3 className="m-0 text-sm font-semibold">Compatibility</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {targets.map((target) => (
                        <span key={target} className="sw-chip sw-chip--muted">
                          {target}
                        </span>
                      ))}
                      {targets.length === 0 ? <p className="text-sm text-[var(--sw-muted)]">No targets listed.</p> : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="sw-panel">
                <div className="sw-panel__head">
                  <div>
                    <h2>Source</h2>
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

              <section className="sw-panel">
                <div className="sw-panel__head">
                  <div>
                    <h2>Reception</h2>
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
            </div>
          ) : null}

          {stage === "sandbox" ? (
            <div className="flex flex-col gap-4" hidden={Boolean(evidence)}>
              <RunnerClient
                skill={skill}
                initialRun={initialRun}
                sandboxReadiness={sandboxReadiness}
                initialMode={initialMode}
                embedded
                layout="guided"
                onRunComplete={onRunComplete}
              />
              {bridgeVisible && !bridgeDismissed ? (
                <div className="sw-post-run-bridge" data-testid="studio-post-run-bridge">
                  <div>
                    <strong>Sandbox prove succeeded.</strong>
                    <p>Take this version home, or inspect evidence.</p>
                  </div>
                  <div className="sw-post-run-bridge__actions">
                    <FirebenchButton type="button" onClick={() => goStage("distribution")}>
                      Distribute this version
                    </FirebenchButton>
                    <FirebenchButton
                      type="button"
                      variant="ghost"
                      onClick={() => openEvidence(latestScore > 0 ? "evals" : "versions")}
                    >
                      Open Evidence
                    </FirebenchButton>
                    <FirebenchButton type="button" variant="ghost" onClick={() => setBridgeDismissed(true)} aria-label="Dismiss">
                      <X className="size-4" aria-hidden="true" />
                    </FirebenchButton>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!evidence && stage === "distribution" ? <SkillDistributionPanel skill={skill} version={version} /> : null}
        </div>

        {!compact ? (
          <aside className="sw-evidence-rail" aria-label="Evidence">
            <h3>Evidence</h3>
            <EvidenceButton active={evidence === "versions"} onClick={() => openEvidence("versions")} label="Version history" />
            <EvidenceButton active={evidence === "evals"} onClick={() => openEvidence("evals")} label="Evaluation suites" />
            <EvidenceButton active={evidence === "graph"} onClick={() => openEvidence("graph")} label="Dependency map" />
            <Link href={`/terminal?skill=${skill.slug}`} className="sw-evidence-link">
              <TerminalSquare className="size-3.5" aria-hidden="true" />
              Open Live Terminal
            </Link>
          </aside>
        ) : null}
      </div>
    </FirebenchPage>
  );
}

function StageTab({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <button type="button" role="tab" aria-selected={active} data-active={active} className="sw-stage" onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

function EvidenceButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className="sw-evidence-btn" aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}
