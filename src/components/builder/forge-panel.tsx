"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Flame, LoaderCircle } from "lucide-react";
import type { ForgeEvent, ForgeEvidence } from "@/lib/marketplace-forge";

const MAX_BATCHES = 5;

export type ForgePanelProps = {
  skillMarkdown: string;
  skillName?: string;
  slug?: string;
  packageId?: string;
  onDraftPublished?: (urls: unknown) => void;
};

type LedgerEntry = {
  id: string;
  kind: string;
  title: string;
  detail?: string;
  tone?: "default" | "ok" | "warn" | "error";
};

type PendingHitl = Extract<ForgeEvent, { type: "hitl" }>;

type ForgeFlags = {
  approvePublic?: boolean;
  confirmDestructive?: boolean;
  userApprovedHighRisk?: boolean;
};

function isForgeEvent(value: unknown): value is ForgeEvent {
  return Boolean(value && typeof value === "object" && "type" in value && typeof (value as { type: unknown }).type === "string");
}

function urlsForSlug(skillSlug: string) {
  return {
    detail: `/skills/${skillSlug}`,
    marketplace: "/",
    mySkills: "/my-skills",
    run: `/skills/${skillSlug}/run`,
    edit: `/builder?slug=${encodeURIComponent(skillSlug)}`,
  };
}

export function ForgePanel({
  skillMarkdown,
  skillName,
  slug,
  packageId,
  onDraftPublished,
}: ForgePanelProps) {
  const [goal, setGoal] = useState("Validate, prove in sandbox, and publish a private draft.");
  const [useSkillMd, setUseSkillMd] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState("");
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [pendingHitl, setPendingHitl] = useState<PendingHitl | null>(null);
  const [pendingContinuation, setPendingContinuation] = useState<string | undefined>();
  const [batchCount, setBatchCount] = useState(0);
  const ledgerIdRef = useRef(0);

  function pushLedger(entry: Omit<LedgerEntry, "id">) {
    ledgerIdRef.current += 1;
    setLedger((current) => [...current, { ...entry, id: `forge-${ledgerIdRef.current}` }]);
  }

  function recordEvent(event: ForgeEvent) {
    switch (event.type) {
      case "plan":
        pushLedger({ kind: "plan", title: "Plan", detail: event.steps.join(" → ") });
        break;
      case "tool_start":
        pushLedger({ kind: "tool_start", title: `Tool · ${event.tool}`, detail: summarizeUnknown(event.input) });
        break;
      case "tool_result": {
        const evidence = event.result.evidence;
        pushLedger({
          kind: "tool_result",
          title: `${event.tool} · ${event.result.ok ? "ok" : "failed"}`,
          detail: event.result.error || evidence?.summary || summarizeUnknown(event.result.data),
          tone: event.result.ok ? "ok" : "error",
        });
        if (evidence) pushEvidence(evidence);
        if (event.result.ok && (event.tool === "publish_skill_draft" || event.tool === "request_public_publish")) {
          const data = event.result.data as { skill?: { slug?: string }; packageId?: string } | undefined;
          const publishedSlug = data?.skill?.slug;
          if (publishedSlug && onDraftPublished) onDraftPublished(urlsForSlug(publishedSlug));
        }
        break;
      }
      case "message":
        pushLedger({ kind: "message", title: "Assistant", detail: event.content });
        break;
      case "hitl":
        pushLedger({ kind: "hitl", title: `HITL · ${event.action}`, detail: event.reason, tone: "warn" });
        break;
      case "continuation":
        pushLedger({ kind: "continuation", title: `Continuation · batch ${event.batch}`, detail: event.prompt });
        break;
      case "complete":
        pushLedger({
          kind: "complete",
          title: "Complete",
          detail: `package=${event.packageId ?? "none"} · evidence=${event.evidenceIds.length} · steps=${event.metrics.steps}`,
          tone: "ok",
        });
        break;
      default:
        break;
    }
  }

  function pushEvidence(evidence: ForgeEvidence) {
    pushLedger({
      kind: "evidence",
      title: `Evidence · ${evidence.kind}`,
      detail: evidence.summary,
      tone: evidence.ok ? "ok" : "error",
    });
  }

  async function consumeForgeStream(body: Record<string, unknown>) {
    const response = await fetch("/api/forge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      setNeedsSignIn(true);
      throw new Error("Sign in to run Marketplace Forge");
    }

    if (!response.ok || !response.body) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || `Forge request failed (${response.status}).`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const streamState: {
      hitl: PendingHitl | null;
      continuation: Extract<ForgeEvent, { type: "continuation" }> | null;
    } = { hitl: null, continuation: null };

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return;
      }
      if (!isForgeEvent(parsed)) return;
      recordEvent(parsed);
      if (parsed.type === "hitl") streamState.hitl = parsed;
      if (parsed.type === "continuation") streamState.continuation = parsed;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
    }
    if (buffer.trim()) handleLine(buffer);

    return streamState;
  }

  async function runBatches(startContinuation?: string, flags: ForgeFlags = {}, startBatch = 1) {
    setBusy(true);
    setError("");
    setNeedsSignIn(false);
    setPendingHitl(null);
    setPendingContinuation(undefined);

    let continuation = startContinuation;
    let batches = Math.max(0, startBatch - 1);
    const goalText = goal.trim();
    let waitingForHitl = false;

    try {
      do {
        batches += 1;
        setBatchCount(batches);
        setProgress(continuation ? `Continuing forge · batch ${batches}` : `Running Marketplace Forge · batch ${batches}`);
        const result = await consumeForgeStream({
          goal: goalText,
          skillMarkdown: useSkillMd ? skillMarkdown : undefined,
          skillName,
          slug,
          packageId: packageId || undefined,
          continuation,
          batch: batches,
          maxBatches: MAX_BATCHES,
          approvePublic: flags.approvePublic || undefined,
          confirmDestructive: flags.confirmDestructive || undefined,
          userApprovedHighRisk: flags.userApprovedHighRisk || undefined,
        });

        if (result.hitl) {
          waitingForHitl = true;
          setPendingHitl(result.hitl);
          setPendingContinuation(result.continuation?.prompt);
          setProgress("Waiting for confirmation");
          return;
        }

        continuation = result.continuation?.prompt;
      } while (continuation && batches < MAX_BATCHES);

      if (continuation) {
        waitingForHitl = true;
        setPendingContinuation(continuation);
        setPendingHitl({
          type: "hitl",
          reason: "Five forge batches completed. Continue to keep going.",
          action: "clarify",
        });
        setProgress("Batch limit reached. Confirm to continue.");
      } else {
        setProgress("Forge finished.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message !== "Sign in to run Marketplace Forge") setError(message);
      pushLedger({ kind: "error", title: "Error", detail: message, tone: "error" });
    } finally {
      setBusy(false);
      if (!waitingForHitl) setProgress("");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!goal.trim() || busy) return;
    setLedger([]);
    ledgerIdRef.current = 0;
    void runBatches(undefined, {}, 1);
  }

  function onHitl(action: "approve_publish" | "confirm_destructive" | "continue") {
    if (busy) return;
    const flags: ForgeFlags =
      action === "approve_publish"
        ? { approvePublic: true, userApprovedHighRisk: true }
        : action === "confirm_destructive"
          ? { confirmDestructive: true, userApprovedHighRisk: true }
          : {};
    const nextBatch = Math.min(batchCount + 1, MAX_BATCHES);
    void runBatches(pendingContinuation || "Continue forge lifecycle.", flags, nextBatch);
  }

  return (
    <section className="builder-band" aria-labelledby="marketplace-forge-title" data-testid="marketplace-forge-panel">
      <header className="builder-band-header">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary" aria-hidden="true">
            <Flame className="size-5" />
          </span>
          <div>
            <div className="builder-eyebrow text-primary">Marketplace Forge</div>
            <h3 id="marketplace-forge-title">Skill lifecycle</h3>
            <p>Validate, sandbox-prove, and publish a draft with live evidence. HITL gates stay on for public publish and destructive confirms.</p>
          </div>
        </div>
      </header>

      {needsSignIn ? (
        <div className="builder-warning-banner" role="status">
          Sign in to run Marketplace Forge.{" "}
          <Link href="/sign-in" className="font-semibold text-primary underline-offset-2 hover:underline">
            Sign in
          </Link>
        </div>
      ) : null}

      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-foreground">Goal</span>
          <textarea
            className="builder-textarea min-h-24"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="Describe the forge goal…"
            disabled={busy}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={useSkillMd}
            onChange={(event) => setUseSkillMd(event.target.checked)}
            disabled={busy}
          />
          Use current skill markdown from the editor
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="builder-primary-button" disabled={busy || !goal.trim()}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Flame className="size-4" aria-hidden="true" />}
            {busy ? "Forging…" : "Run Marketplace Forge"}
          </button>
          {progress ? <span className="text-xs text-muted-foreground">{progress}</span> : null}
        </div>
      </form>

      {error ? <div className="builder-error-banner">{error}</div> : null}

      {pendingHitl ? (
        <div className="mt-3 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm text-foreground">{pendingHitl.reason}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="builder-primary-button" disabled={busy} onClick={() => onHitl("approve_publish")}>
              Approve Publish
            </button>
            <button type="button" className="builder-secondary-button" disabled={busy} onClick={() => onHitl("confirm_destructive")}>
              Confirm Destructive
            </button>
            <button type="button" className="builder-secondary-button" disabled={busy} onClick={() => onHitl("continue")}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {ledger.length ? (
        <ol className="mt-4 max-h-72 space-y-2 overflow-y-auto border-t border-border pt-3" aria-live="polite" aria-label="Forge ledger">
          {ledger.map((entry) => (
            <li
              key={entry.id}
              className={`rounded-md border px-3 py-2 text-xs ${
                entry.tone === "ok"
                  ? "border-primary/25 bg-primary/5"
                  : entry.tone === "warn"
                    ? "border-primary/40 bg-primary/10"
                    : entry.tone === "error"
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border bg-card"
              }`}
            >
              <div className="font-semibold text-foreground">{entry.title}</div>
              {entry.detail ? <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{entry.detail}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function summarizeUnknown(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value.slice(0, 280);
  try {
    return JSON.stringify(value).slice(0, 280);
  } catch {
    return undefined;
  }
}
