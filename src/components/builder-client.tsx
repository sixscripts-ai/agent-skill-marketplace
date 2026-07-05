"use client";

import { useMemo, useState } from "react";
import { buildMockRun } from "@/lib/runner";
import { compatibilityTargets, permissionKeys } from "@/lib/data";
import type { ParsedSkillImport, SkillDraftInput } from "@/lib/types";
import { Badge, Panel } from "./ui";
import { CodeBlock } from "./code-block";

const starterSkill = `---
name: incident-postmortem-assistant
description: Use when the user needs to turn logs, traces, commits, and alerts into an incident timeline.
---

# Incident Postmortem Assistant

Use this skill when debugging production incidents or writing postmortem drafts.

## Workflow
1. Ingest logs, alerts, trace snippets, and relevant commits.
2. Build a timeline with confidence labels.
3. Identify likely root cause and unresolved evidence gaps.
4. Draft action items with owners and verification checks.`;

export function BuilderClient({ initialDraft }: { initialDraft?: SkillDraftInput }) {
  const [name, setName] = useState(initialDraft?.name ?? "Incident Postmortem Assistant");
  const [slug, setSlug] = useState(initialDraft?.slug ?? "incident-postmortem-assistant");
  const [category, setCategory] = useState(initialDraft?.category ?? "Reliability");
  const [summary, setSummary] = useState(
    initialDraft?.summary ?? "Turns logs, traces, commits, and alerts into a source-backed incident timeline.",
  );
  const [skillMd, setSkillMd] = useState(initialDraft?.skillMd ?? starterSkill);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialDraft?.permissions ?? ["read_files", "network"]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>(initialDraft?.compatibilityTargets ?? ["Codex", "Claude", "VS Code"]);
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">(initialDraft?.visibility ?? "public");
  const [testInput, setTestInput] = useState("Create a postmortem from a failed deployment trace.");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [importResult, setImportResult] = useState<ParsedSkillImport | null>(null);

  const issues = useMemo(() => {
    const next: string[] = [];
    if (name.trim().length < 4) next.push("Name must be at least 4 characters.");
    if (!/^[a-z0-9-]+$/.test(slug)) next.push("Slug must use lowercase letters, numbers, and hyphens.");
    if (summary.trim().length < 40) next.push("Summary should explain the skill in at least 40 characters.");
    if (!skillMd.includes("# ")) next.push("SKILL.md needs a top-level heading.");
    if (!skillMd.includes("## Workflow")) next.push("SKILL.md needs a Workflow section.");
    if (selectedPermissions.length === 0) next.push("Select at least one permission.");
    if (selectedTargets.length === 0) next.push("Select at least one install target.");
    return next;
  }, [name, selectedPermissions.length, selectedTargets.length, skillMd, slug, summary]);

  const testRun = buildMockRun("agent-observer", testInput);

  function toggle(value: string, selected: string[], setter: (value: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  async function importSkill() {
    const response = await fetch("/api/skills/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skillMd }),
    });
    const parsed = (await response.json()) as ParsedSkillImport;
    setImportResult(parsed);
    setName(parsed.name);
    setSlug(parsed.slug);
    setCategory(parsed.category);
    setSummary(parsed.description);
    setSelectedPermissions(parsed.permissions);
    setSelectedTargets(parsed.compatibilityTargets);
  }

  async function publishSkill() {
    setIsSaving(true);
    const response = await fetch("/api/skills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        category,
        summary,
        skillMd,
        permissions: selectedPermissions,
        compatibilityTargets: selectedTargets,
        visibility,
      }),
    });
    if (response.ok) setPublishedSlug(slug);
    setIsSaving(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Panel className="p-5" variant="floating">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Skill Builder</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Create, validate, preview, test, and publish a portable SKILL.md package.
            </p>
          </div>
          <Badge tone={issues.length ? "amber" : "green"}>{issues.length ? "needs review" : "valid"}</Badge>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Slug" value={slug} onChange={setSlug} />
          <Field label="Category" value={category} onChange={setCategory} />
          <Field label="Summary" value={summary} onChange={setSummary} />
        </div>
        <label className="mt-5 block text-sm font-medium text-slate-300">SKILL.md</label>
        <textarea
          value={skillMd}
          onChange={(event) => setSkillMd(event.target.value)}
          className="mt-2 min-h-80 w-full rounded-md border border-white/10 bg-slate-950 p-3 font-mono text-sm leading-6 text-white outline-none focus:border-cyan-300/60"
        />
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Checklist
            title="Permissions"
            values={permissionKeys}
            selected={selectedPermissions}
            toggle={(value) => toggle(value, selectedPermissions, setSelectedPermissions)}
          />
          <Checklist
            title="Install targets"
            values={compatibilityTargets}
            selected={selectedTargets}
            toggle={(value) => toggle(value, selectedTargets, setSelectedTargets)}
          />
        </div>
        <label className="mt-5 block text-sm font-medium text-slate-300">
          Visibility
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "public" | "private" | "unlisted")}
            className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
          >
            <option value="public">public</option>
            <option value="private">private</option>
            <option value="unlisted">unlisted</option>
          </select>
        </label>
        <button
          onClick={importSkill}
          className="mt-6 h-11 w-full rounded-md border border-white/10 bg-white/[0.04] text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
        >
          Parse / import SKILL.md
        </button>
        <button
          onClick={publishSkill}
          className="mt-3 h-11 w-full rounded-md bg-cyan-300 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={issues.length > 0 || isSaving}
        >
          {isSaving ? "Saving..." : "Publish version"}
        </button>
      </Panel>

      <div className="space-y-6">
        <Panel className="p-5" variant="floating">
          <h2 className="font-semibold text-white">Validation</h2>
          <div className="mt-4 space-y-2">
            {issues.length ? (
              issues.map((issue) => (
                <div key={issue} className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                  {issue}
                </div>
              ))
            ) : (
              <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                Ready to publish. The draft has required metadata, workflow, permissions, and targets.
              </div>
            )}
            {importResult ? (
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
                Parsed import: {importResult.permissions.length} permission(s), {importResult.compatibilityTargets.length} target(s),{" "}
                {importResult.issues.length} warning(s).
              </div>
            ) : null}
            {publishedSlug ? (
              <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">
                Saved to persistent store. View it at /skills/{publishedSlug} or find it in the marketplace.
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5" variant="floating">
          <h2 className="font-semibold text-white">Marketplace preview</h2>
          <div className="glass-subtle mt-4 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white">{name}</h3>
                <p className="mt-1 text-sm text-slate-500">{category}</p>
              </div>
              <Badge tone="amber">Experimental</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{summary}</p>
          </div>
        </Panel>

        <Panel className="p-5" variant="floating">
          <h2 className="font-semibold text-white">Test skill</h2>
          <input
            value={testInput}
            onChange={(event) => setTestInput(event.target.value)}
            className="mt-4 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
          />
          <div className="glass-subtle mt-4 rounded-xl p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">mock output</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{testRun.output}</p>
          </div>
        </Panel>

        <Panel className="p-5" variant="floating">
          <h2 className="font-semibold text-white">Generated README excerpt</h2>
          <CodeBlock
            code={`# ${name}\n\n${summary}\n\n## Compatibility\n${selectedTargets.map((target) => `- ${target}`).join("\n")}\n\n## Permissions\n${selectedPermissions.map((permission) => `- ${permission}`).join("\n")}\n\nVisibility: ${visibility}`}
          />
        </Panel>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
      />
    </label>
  );
}

function Checklist({
  title,
  values,
  selected,
  toggle,
}: {
  title: string;
  values: readonly string[];
  selected: string[];
  toggle: (value: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            onClick={() => toggle(value)}
            className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
              selected.includes(value)
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                : "border-white/10 bg-white/[0.03] text-slate-400"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
