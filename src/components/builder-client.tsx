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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Skill Builder</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Create, validate, test, and publish a portable SKILL.md package.
          </p>
        </div>
        <button
          onClick={publishSkill}
          className="h-10 rounded-md border border-neutral-950 bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={issues.length > 0 || isSaving}
        >
          {isSaving ? "Saving..." : "Publish version"}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr_360px]">
        <Panel className="p-5">
          <h2 className="text-base font-semibold text-neutral-950">Metadata</h2>
          <div className="mt-5 flex flex-col gap-4">
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Slug" value={slug} onChange={setSlug} />
            <Field label="Category" value={category} onChange={setCategory} />
            <Field label="Summary" value={summary} onChange={setSummary} />
            <label className="block text-sm font-medium text-neutral-700">
              Visibility
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as "public" | "private" | "unlisted")}
                className="mt-2 h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="public">public</option>
                <option value="private">private</option>
                <option value="unlisted">unlisted</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex flex-col gap-5">
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
          <button
            onClick={importSkill}
            className="mt-6 h-10 w-full rounded-md border border-neutral-300 bg-white text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            Parse / import SKILL.md
          </button>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-neutral-950">SKILL.md editor</h2>
            <Badge tone={issues.length ? "amber" : "green"}>{issues.length ? "needs review" : "valid"}</Badge>
          </div>
          <textarea
            value={skillMd}
            onChange={(event) => setSkillMd(event.target.value)}
            className="mt-4 min-h-[620px] w-full rounded-md border p-4 font-mono text-sm leading-6 outline-none"
          />
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Validation</h2>
            <div className="mt-4 flex flex-col gap-2">
              {issues.length ? (
                issues.map((issue) => (
                  <div key={issue} className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    {issue}
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  Ready to publish. Required metadata, workflow, permissions, and targets are present.
                </div>
              )}
              {importResult ? (
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                  Parsed import: {importResult.permissions.length} permission(s), {importResult.compatibilityTargets.length} target(s),{" "}
                  {importResult.issues.length} warning(s).
                </div>
              ) : null}
              {publishedSlug ? (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  Saved. View it at /skills/{publishedSlug} or find it in the marketplace.
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Marketplace preview</h2>
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-neutral-950">{name}</h3>
                  <p className="mt-1 text-sm text-neutral-500">{category}</p>
                </div>
                <Badge tone="amber">Experimental</Badge>
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600">{summary}</p>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Test skill</h2>
            <input
              value={testInput}
              onChange={(event) => setTestInput(event.target.value)}
              className="mt-4 h-10 w-full rounded-md border px-3 text-sm outline-none"
            />
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">mock output</div>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{testRun.output}</p>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">README excerpt</h2>
            <div className="mt-3">
              <CodeBlock
                code={`# ${name}\n\n${summary}\n\n## Compatibility\n${selectedTargets.map((target) => `- ${target}`).join("\n")}\n\n## Permissions\n${selectedPermissions.map((permission) => `- ${permission}`).join("\n")}\n\nVisibility: ${visibility}`}
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border px-3 text-sm outline-none"
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
      <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            onClick={() => toggle(value)}
            className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
              selected.includes(value)
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
