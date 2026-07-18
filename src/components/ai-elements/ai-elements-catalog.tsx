"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Check,
  Copy,
  MessageSquareText,
  Play,
  Search,
  TerminalSquare,
  Wrench,
} from "lucide-react";
import { SafeMessageResponse } from "@/components/safe-message-response";
import {
  FirebenchButton,
  FirebenchCode,
  FirebenchHeroCard,
  FirebenchHeroIntro,
  FirebenchPage,
  FirebenchTabStrip,
  FirebenchTag,
  type FirebenchHeat,
  type FirebenchTabItem,
} from "@/components/firebench";
import { FileTree, FileTreeFile, FileTreeFolder } from "./file-tree";
import { Suggestion, Suggestions } from "./suggestion";
import { Terminal } from "./terminal";
import { Tool, ToolContent, ToolHeader, ToolInput } from "./tool";

type ElementStatus = "installed" | "used" | "planned";
type ElementCategory = "Chat" | "Code" | "Workflow" | "Voice" | "Utilities";

type CatalogItem = {
  id: string;
  category: ElementCategory;
  status: ElementStatus;
  description: string;
  surfaces?: string;
};

const TWEAKS_KEY = "ai-elements.tweaks.v2";
const DEFAULT_HEAT: FirebenchHeat = "bold";

const catalog: CatalogItem[] = [
  { id: "message", category: "Chat", status: "used", description: "Safe markdown rendering for skill output, reports, and artifacts.", surfaces: "Runner, Builder, Traces" },
  { id: "conversation", category: "Chat", status: "used", description: "Scrollable prompt/response history with jump-to-bottom.", surfaces: "Runner" },
  { id: "prompt-input", category: "Chat", status: "used", description: "Composer with submit, attachments, and keyboard behavior.", surfaces: "Runner" },
  { id: "suggestion", category: "Chat", status: "used", description: "Guided follow-up prompts for the next user action.", surfaces: "Runner" },
  { id: "reasoning", category: "Chat", status: "used", description: "Collapsible model analysis panels.", surfaces: "Runner" },
  { id: "tool", category: "Chat", status: "used", description: "Tool call status, parameters, and output display.", surfaces: "Runner, Traces" },
  { id: "confirmation", category: "Chat", status: "used", description: "Approval UI for shell, network, and write permissions.", surfaces: "Runner" },
  { id: "sources", category: "Chat", status: "planned", description: "Citation lists for research-backed outputs." },
  { id: "inline-citation", category: "Chat", status: "planned", description: "Inline source references inside generated text." },
  { id: "terminal", category: "Code", status: "used", description: "ANSI-aware stdout/stderr for sandbox runs.", surfaces: "Runner, Traces" },
  { id: "file-tree", category: "Code", status: "used", description: "Package, workspace, and artifact browser.", surfaces: "Runner, Traces" },
  { id: "code-block", category: "Code", status: "installed", description: "Syntax-highlighted code with copy support." },
  { id: "shimmer", category: "Utilities", status: "installed", description: "AI-native loading placeholders." },
  { id: "test-results", category: "Code", status: "planned", description: "Eval suite results with failures and stats." },
  { id: "stack-trace", category: "Code", status: "planned", description: "Readable runtime errors with collapsible frames." },
  { id: "environment-variables", category: "Code", status: "planned", description: "Masked env display for setup and debug pages." },
  { id: "package-info", category: "Code", status: "planned", description: "Dependency and package metadata." },
  { id: "artifact", category: "Code", status: "planned", description: "Rendered previews for generated outputs." },
  { id: "sandbox", category: "Code", status: "planned", description: "Tabbed code plus execution preview." },
  { id: "canvas", category: "Workflow", status: "planned", description: "Visual workflow map for skill dependencies." },
  { id: "node", category: "Workflow", status: "planned", description: "Workflow node blocks for agent steps." },
  { id: "edge", category: "Workflow", status: "planned", description: "Connections between workflow nodes." },
  { id: "panel", category: "Workflow", status: "planned", description: "Inspector panels for selected steps." },
  { id: "controls", category: "Workflow", status: "planned", description: "Zoom and pan controls for diagrams." },
  { id: "checkpoint", category: "Workflow", status: "planned", description: "Saved run states and approval milestones." },
  { id: "task", category: "Workflow", status: "planned", description: "Queued, running, complete, and failed task states." },
  { id: "persona", category: "Voice", status: "planned", description: "Animated voice-agent visual state." },
  { id: "speech-input", category: "Voice", status: "planned", description: "Browser speech capture for prompts." },
  { id: "transcription", category: "Voice", status: "planned", description: "Synced transcript display." },
  { id: "audio-player", category: "Voice", status: "planned", description: "Playback for generated or uploaded audio." },
  { id: "model-selector", category: "Utilities", status: "planned", description: "Model and provider picker UI." },
  { id: "attachments", category: "Utilities", status: "planned", description: "Attached files and uploaded context." },
  { id: "web-preview", category: "Utilities", status: "planned", description: "Iframe preview for generated pages." },
];

const categories: Array<"All" | ElementCategory> = ["All", "Chat", "Code", "Workflow", "Voice", "Utilities"];
const statusFilters: Array<"All" | ElementStatus> = ["All", "used", "installed", "planned"];

const playgroundTabs: FirebenchTabItem[] = [
  { id: "message", label: "Message", group: "Chat", icon: <MessageSquareText className="size-3.5" aria-hidden="true" /> },
  { id: "suggestion", label: "Suggestion", group: "Chat" },
  { id: "tool", label: "Tool", group: "Chat", icon: <Wrench className="size-3.5" aria-hidden="true" /> },
  { id: "terminal", label: "Terminal", group: "Code", icon: <TerminalSquare className="size-3.5" aria-hidden="true" /> },
  { id: "file-tree", label: "File tree", group: "Code", icon: <Boxes className="size-3.5" aria-hidden="true" /> },
];

const runnerBundleCommand =
  "pnpm dlx shadcn@latest add https://elements.ai-sdk.dev/api/registry/conversation.json https://elements.ai-sdk.dev/api/registry/prompt-input.json https://elements.ai-sdk.dev/api/registry/suggestion.json https://elements.ai-sdk.dev/api/registry/reasoning.json https://elements.ai-sdk.dev/api/registry/terminal.json https://elements.ai-sdk.dev/api/registry/tool.json https://elements.ai-sdk.dev/api/registry/file-tree.json https://elements.ai-sdk.dev/api/registry/confirmation.json";

const markdownExample = `# Sandbox run output

**Skill:** Sandbox Script Runner
**Status:** waiting for shell approval

| Step | Result |
| --- | --- |
| Permission check | shell requires approval |
| File mount | 14 package files ready |
| Network policy | deny-all |

Approve shell execution, then rerun with a 60s timeout.`;

function statusLabel(status: ElementStatus) {
  if (status === "used") return "In app";
  if (status === "installed") return "Installed";
  return "Planned";
}

function statusTag(status: ElementStatus) {
  if (status === "used") return "[ IN APP ]";
  if (status === "installed") return "[ READY ]";
  return "[ PLANNED ]";
}

function PlaygroundDemo({ id }: { id: string }) {
  if (id === "suggestion") {
    return (
      <Suggestions>
        <Suggestion suggestion="Retry with a longer timeout" />
        <Suggestion suggestion="Show the permission denial" />
        <Suggestion suggestion="Inspect workspace files" />
      </Suggestions>
    );
  }
  if (id === "tool") {
    return (
      <Tool defaultOpen className="mb-0">
        <ToolHeader state="approval-requested" title="Shell execution" type="tool-shell" />
        <ToolContent>
          <ToolInput input={{ command: "npm test", timeoutMs: 60000 }} />
        </ToolContent>
      </Tool>
    );
  }
  if (id === "terminal") {
    return (
      <Terminal
        autoScroll
        className="m-0 min-h-[11rem] rounded-lg border-0"
        output={
          "$ npm test\n\n> agent-skill@0.1.0 test\n\n PASS  permissions.test.ts\n PASS  package-profile.test.ts\n\nTests  10 passed (10)\n"
        }
      />
    );
  }
  if (id === "file-tree") {
    return (
      <FileTree defaultExpanded={new Set(["/", "/scripts", "/references"])} selectedPath="/SKILL.md">
        <FileTreeFolder name="agent-skill" path="/">
          <FileTreeFile name="SKILL.md" path="/SKILL.md" />
          <FileTreeFolder name="scripts" path="/scripts">
            <FileTreeFile name="run.sh" path="/scripts/run.sh" />
          </FileTreeFolder>
          <FileTreeFolder name="references" path="/references">
            <FileTreeFile name="REFERENCE.md" path="/references/REFERENCE.md" />
          </FileTreeFolder>
        </FileTreeFolder>
      </FileTree>
    );
  }
  return <SafeMessageResponse>{markdownExample}</SafeMessageResponse>;
}

export function AiElementsCatalog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | ElementCategory>("All");
  const [status, setStatus] = useState<"All" | ElementStatus>("All");
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [heat, setHeat] = useState<FirebenchHeat>(DEFAULT_HEAT);
  const [activeTab, setActiveTab] = useState("message");
  const [tweaksReady, setTweaksReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TWEAKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { heat?: FirebenchHeat };
        if (parsed.heat === "soft" || parsed.heat === "medium" || parsed.heat === "bold") {
          setHeat(parsed.heat);
        }
      }
    } catch {
      /* ignore */
    }
    setTweaksReady(true);
  }, []);

  useEffect(() => {
    if (!tweaksReady) return;
    localStorage.setItem(TWEAKS_KEY, JSON.stringify({ heat, hero: "card" }));
  }, [heat, tweaksReady]);

  const counts = useMemo(
    () => ({
      used: catalog.filter((item) => item.status === "used").length,
      installed: catalog.filter((item) => item.status !== "planned").length,
      planned: catalog.filter((item) => item.status === "planned").length,
      total: catalog.length,
    }),
    [],
  );

  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (status !== "All" && item.status !== status) return false;
      if (!needle) return true;
      return [item.id, item.description, item.surfaces, item.category]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [category, query, status]);

  const activeLabel = playgroundTabs.find((tab) => tab.id === activeTab)?.label ?? "Message";

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(runnerBundleCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function copyElementId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <FirebenchPage heat={heat} canvas>
      <div className="fb-tweaks" aria-label="Design tweaks">
        <span style={{ color: "var(--fb-heat)", fontWeight: 700, letterSpacing: "0.06em", fontSize: "0.68rem" }}>
          TWEAKS
        </span>
        <label>
          Heat
          <select value={heat} onChange={(event) => setHeat(event.target.value as FirebenchHeat)}>
            <option value="soft">Soft</option>
            <option value="medium">Medium</option>
            <option value="bold">Bold</option>
          </select>
        </label>
        <FirebenchButton variant="ghost" onClick={() => setHeat(DEFAULT_HEAT)}>
          Reset
        </FirebenchButton>
      </div>

      <FirebenchHeroIntro
        kicker="// Components //"
        title="AI Elements"
        accent="playground"
        lead="Same heat system as the product shell — browse the chat, tool, and sandbox primitives behind Runner and Builder."
      />

      <div className="fb-tags">
        <FirebenchTag>[ CHAT ]</FirebenchTag>
        <FirebenchTag>[ TOOLS ]</FirebenchTag>
        <FirebenchTag>[ SANDBOX ]</FirebenchTag>
        <FirebenchTag>[ WORKFLOW ]</FirebenchTag>
      </div>

      <div className="fb-stats" aria-label="Catalog summary">
        <div className="fb-stat">
          <strong>{counts.used}</strong>
          <span>In product</span>
        </div>
        <div className="fb-stat">
          <strong>{counts.installed}</strong>
          <span>Installed</span>
        </div>
        <div className="fb-stat">
          <strong>{counts.planned}</strong>
          <span>Planned</span>
        </div>
        <div className="fb-stat">
          <strong>{counts.total}</strong>
          <span>Total</span>
        </div>
      </div>

      <FirebenchTabStrip
        groups={["Chat", "Code"]}
        items={playgroundTabs}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      <FirebenchHeroCard
        actionsLeft={
          <>
            <FirebenchTag>{statusTag("used")}</FirebenchTag>
            <span className="text-xs font-semibold text-[var(--fb-muted)]">{activeLabel}</span>
          </>
        }
        actionsRight={
          <>
            <FirebenchButton variant="ghost" onClick={() => void copyElementId(activeTab)}>
              {copiedId === activeTab ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copiedId === activeTab ? "Copied" : "Get code"}
            </FirebenchButton>
            <Link href="/skills/agent-observer/run" className="fb-cta fb-cta--primary">
              <Play className="size-4" aria-hidden="true" />
              Open Runner
            </Link>
          </>
        }
      >
        <PlaygroundDemo id={activeTab} />
      </FirebenchHeroCard>

      <div className="fb-actions">
        <Link href="/builder" className="fb-cta fb-cta--ghost">
          <Boxes className="size-4" aria-hidden="true" />
          Skill Builder
        </Link>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="ai-elements-catalog-title">
        <div className="fb-section-head">
          <h2 id="ai-elements-catalog-title" className="fb-section-title">
            Catalog
          </h2>
          <p className="fb-section-note">
            <strong style={{ color: "var(--fb-heat)" }}>{items.length}</strong> shown
          </p>
        </div>

        <div className="fb-rail">
          <label className="fb-search">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Search elements</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search message, terminal, workflow…"
            />
          </label>
          <div className="fb-chips" role="group" aria-label="Category">
            {categories.map((value) => (
              <button
                key={value}
                type="button"
                className="fb-chip"
                data-active={category === value}
                onClick={() => setCategory(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="fb-chips" role="group" aria-label="Status">
            {statusFilters.map((value) => (
              <button
                key={value}
                type="button"
                className="fb-chip"
                data-active={status === value}
                onClick={() => setStatus(value)}
              >
                {value === "All" ? "All statuses" : statusLabel(value)}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="fb-section-note rounded-[var(--fb-radius)] border border-dashed border-[color-mix(in_srgb,var(--fb-heat)_35%,var(--fb-border))] bg-[var(--fb-heat-8)] px-4 py-10 text-center">
            No elements match this filter.
          </p>
        ) : (
          <div className="fb-list">
            {items.map((item) => (
              <article key={item.id} className="fb-row">
                <div>
                  <h3 className="fb-row__name">{item.id}</h3>
                  <div className="fb-row__meta">
                    <FirebenchTag>{item.category}</FirebenchTag>
                    <span>{statusTag(item.status)}</span>
                    {item.surfaces ? <span>{item.surfaces}</span> : null}
                  </div>
                </div>
                <p className="fb-row__desc">{item.description}</p>
                <div>
                  <FirebenchButton
                    variant="ghost"
                    onClick={() => void copyElementId(item.id)}
                    style={
                      copiedId === item.id
                        ? { background: "var(--fb-heat)", color: "#fff", borderColor: "var(--fb-heat)" }
                        : undefined
                    }
                  >
                    {copiedId === item.id ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                    {copiedId === item.id ? "Copied" : "Copy id"}
                  </FirebenchButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="fb-stage" aria-labelledby="ai-elements-install-title">
        <div className="fb-stage__label">
          <h2 id="ai-elements-install-title" className="fb-section-title" style={{ fontSize: "1rem" }}>
            Runner console bundle
          </h2>
          <FirebenchButton variant="ghost" onClick={() => void copyCommand()}>
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy command"}
          </FirebenchButton>
        </div>
        <div className="fb-stage__body flex flex-col gap-3">
          <p className="fb-section-note m-0 max-w-xl">
            One focused install for chat and sandbox surfaces — same rhythm as Firecrawl playground “Get code”.
          </p>
          <FirebenchCode label="[ INSTALL ]">{runnerBundleCommand}</FirebenchCode>
          <div className="fb-actions" style={{ justifyContent: "flex-start" }}>
            <Link href="/skills/agent-observer/run" className="fb-cta fb-cta--primary">
              <Wrench className="size-4" aria-hidden="true" />
              Try in Runner
            </Link>
            <Link href="/docs" className="fb-cta fb-cta--ghost">
              Read docs
            </Link>
          </div>
        </div>
      </section>
    </FirebenchPage>
  );
}
