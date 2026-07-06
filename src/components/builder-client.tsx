"use client";

import { useMemo, useState, useEffect, type ChangeEvent } from "react";
import { useCompletion } from "@ai-sdk/react";
import { executeSkillRunStream } from "@/lib/runner";
import { Send, Upload, Sparkles } from "lucide-react";
import { compatibilityTargets, permissionKeys, permissionLabels } from "@/lib/data";
import { parseSkillMarkdown } from "@/lib/skill-import";
import type { ParsedSkillImport, SkillDraftInput, SkillPackageFile, SkillRun } from "@/lib/types";
import { ActionGuide, FeatureWalkthrough } from "./feature-walkthrough";
import { SafeMessageResponse } from "./safe-message-response";
import { Badge, Panel } from "./ui";
import { CodeBlock } from "./code-block";
import { CanvasEditor } from "./canvas-editor";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";
import "prismjs/themes/prism.css";

const starterSkill = `---
name: Incident Postmortem Assistant
description: Use when the user needs to turn logs, traces, commits, and alerts into an incident timeline.
---

# Incident Postmortem Assistant

Use this skill when debugging production incidents or writing postmortem drafts.

## Workflow
1. Ingest logs, alerts, trace snippets, and relevant commits.
2. Build a timeline with confidence labels.
3. Identify likely root cause and unresolved evidence gaps.
4. Draft action items with owners and verification checks.

## Permissions
- read_files: Read uploaded logs, traces, commits, and alert exports.
- network: Inspect allowlisted incident references or docs when approved.

## Examples
- "Create a postmortem from this deployment trace and alert timeline."
- "Review these incident notes and produce root-cause hypotheses with confidence labels."

## Compatibility
- Codex
- Claude
- VS Code`;

export function BuilderClient({ initialDraft }: { initialDraft?: SkillDraftInput }) {
  const [name, setName] = useState(initialDraft?.name ?? "Incident Postmortem Assistant");
  const [slug, setSlug] = useState(initialDraft?.slug ?? "incident-postmortem-assistant");
  const [category, setCategory] = useState(initialDraft?.category ?? "Reliability");
  const [summary, setSummary] = useState(
    initialDraft?.summary ?? "Turns logs, traces, commits, and alerts into a source-backed incident timeline.",
  );
  const [skillMd, setSkillMd] = useState(initialDraft?.skillMd ?? starterSkill);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialDraft?.permissions ?? ["read_files", "write_files", "network", "shell"]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>(initialDraft?.compatibilityTargets ?? ["Codex", "Claude", "VS Code"]);
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">(initialDraft?.visibility ?? "public");
  const [testInput, setTestInput] = useState("Create a postmortem from a failed deployment trace.");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [importResult, setImportResult] = useState<ParsedSkillImport | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [packageUploadId, setPackageUploadId] = useState(initialDraft?.packageUploadId ?? "");
  const [packageFiles, setPackageFiles] = useState<SkillPackageFile[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedUrls, setSavedUrls] = useState<{ detail: string; marketplace: string; mySkills: string; run: string; edit: string } | null>(null);
  const [testRun, setTestRun] = useState<SkillRun | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [viewMode, setViewMode] = useState<"markdown" | "canvas">("markdown");

  const [copilotModel, setCopilotModel] = useState("gpt-4o-mini");
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const { completion, complete, isLoading: isGenerating } = useCompletion({
    api: "/api/skills/generate",
    body: { model: copilotModel },
    onFinish: (prompt, result) => {
      importSkill(result);
    },
  });

  useEffect(() => {
    if (isGenerating && completion) {
      setSkillMd(completion);
    }
  }, [completion, isGenerating]);

  const issues = useMemo(() => {
    const next: string[] = [];
    const lowerSkillMd = skillMd.toLowerCase();
    if (name.trim().length < 4) next.push("Name must be at least 4 characters.");
    if (name.trim().length > 64) next.push("Name must be 64 characters or less.");
    if (!/^[a-z0-9-]+$/.test(slug)) next.push("Slug must use lowercase letters, numbers, and hyphens.");
    if (summary.trim().length < 40) next.push("Summary should explain the skill in at least 40 characters.");
    if (summary.trim().length > 1024) next.push("Summary must be 1024 characters or less.");
    if (!skillMd.trim().startsWith("---")) next.push("SKILL.md needs YAML frontmatter with name and description.");
    if (!/^description:\s*.+$/im.test(skillMd)) next.push("SKILL.md frontmatter needs a description field.");
    if (!skillMd.includes("# ")) next.push("SKILL.md needs a top-level heading.");
    if (!skillMd.includes("## Workflow")) next.push("SKILL.md needs a Workflow section.");
    if (!lowerSkillMd.includes("## permissions")) next.push("SKILL.md needs a Permissions section.");
    if (!lowerSkillMd.includes("## examples")) next.push("SKILL.md needs an Examples section.");
    if (selectedPermissions.length === 0) next.push("Select at least one permission.");
    if (selectedTargets.length === 0) next.push("Select at least one install target.");
    return next;
  }, [name, selectedPermissions.length, selectedTargets.length, skillMd, slug, summary]);

  async function runTest() {
    const prompt = testInput.trim();
    if (!prompt || isTesting) return;
    setIsTesting(true);
    setTestRun(null);

    await executeSkillRunStream({
      skillSlug: "agent-observer",
      input: prompt,
      deniedPermissions: [],
      onRun: (payloadRun) => setTestRun(payloadRun),
      onEvent: (event) => {
        setTestRun((current) => {
          if (!current) return current;
          return {
            ...current,
            events: [...current.events.filter((e) => e.order !== event.order), event].sort(
              (a, b) => a.order - b.order,
            ),
          };
        });
      },
      onOutput: (output) => {
        setTestRun((current) => current ? { ...current, output } : null);
      },
      onComplete: (payloadRun) => setTestRun(payloadRun),
      onError: (message) => {
        setTestRun((current) => {
          if (!current) return null;
          return {
            ...current,
            status: "failed",
            output: message,
          };
        });
      },
    });

    setIsTesting(false);
  }

  function toggle(value: string, selected: string[], setter: (value: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  async function importSkill(nextSkillMd = skillMd) {
    setUploadError("");
    const response = await fetch("/api/skills/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skillMd: nextSkillMd }),
    });
    const payload = (await response.json().catch(() => null)) as (ParsedSkillImport & { error?: string }) | null;
    const localParsed = parseSkillMarkdown(nextSkillMd);
    const parsed =
      response.ok && payload
        ? payload
        : {
            ...localParsed,
            suggestions: [
              ...localParsed.suggestions,
              response.status === 401
                ? "Sign in to save, upload package files, or publish. Local formatting suggestions are available now."
                : "The server parser was unavailable, so local formatting suggestions are shown.",
            ],
          };
    if (!response.ok) {
      setUploadError(payload?.error ?? "Server parser unavailable. Showing local formatting suggestions.");
    }
    setImportResult(parsed);
    setName(parsed.name);
    setSlug(parsed.slug);
    setCategory(parsed.category);
    setSummary(parsed.description);
    setSelectedPermissions(parsed.permissions);
    setSelectedTargets(parsed.compatibilityTargets);
    if (parsed.packageUploadId) setPackageUploadId(parsed.packageUploadId);
    if (parsed.packageFiles) setPackageFiles(parsed.packageFiles);
  }

  async function uploadSkillFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploadError("");
    const form = new FormData();
    for (const file of files) {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      form.append("files", file, relativePath);
    }
    const response = await fetch("/api/skills/upload", { method: "POST", body: form });
    const payload = (await response.json()) as ParsedSkillImport & { error?: string };
    if (!response.ok) {
      setUploadError(payload.error ?? "Upload failed.");
      event.target.value = "";
      return;
    }
    setUploadedFileName(files.length === 1 ? files[0].name : `${files.length} files`);
    setImportResult(payload);
    setPackageUploadId(payload.packageUploadId ?? "");
    setPackageFiles(payload.packageFiles ?? []);
    setSkillMd(payload.primarySkillMd ?? payload.suggestedSkillMd);
    setName(payload.name);
    setSlug(payload.slug);
    setCategory(payload.category);
    setSummary(payload.description);
    setSelectedPermissions(payload.permissions);
    setSelectedTargets(payload.compatibilityTargets);
    event.target.value = "";
  }

  function applySuggestedSkillMd() {
    if (!importResult) return;
    setSkillMd(importResult.suggestedSkillMd);
    setName(importResult.name);
    setSlug(importResult.slug);
    setCategory(importResult.category);
    setSummary(importResult.description);
    setSelectedPermissions(importResult.permissions);
    setSelectedTargets(importResult.compatibilityTargets);
  }

  async function publishSkill() {
    setSaveError("");
    setSavedUrls(null);
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
        packageUploadId: packageUploadId || undefined,
      }),
    });
    const payload = (await response.json()) as { skill?: { slug: string }; urls?: typeof savedUrls; error?: string };
    if (response.ok && payload.skill && payload.urls) {
      setPublishedSlug(payload.skill.slug);
      setSavedUrls(payload.urls);
    } else {
      setSaveError(payload.error ?? "Skill save failed.");
    }
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Skill Builder</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Upload or write a SKILL.md package, repair the format, validate permissions, then publish when it is ready.
          </p>
        </div>
        <button
          onClick={publishSkill}
          data-testid="builder-publish"
          className="h-10 rounded-md border border-neutral-950 bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={issues.length > 0 || isSaving}
        >
          {isSaving ? "Saving..." : "Publish version"}
        </button>
      </div>

      <ActionGuide
        steps={[
          { label: "1", title: "Upload", body: "Bring in SKILL.md, a .skill file, zip, or folder." },
          { label: "2", title: "Format", body: "Parse the file and apply suggested structure fixes." },
          { label: "3", title: "Validate", body: "Resolve missing workflow, permissions, examples, and targets." },
          { label: "4", title: "Preview", body: "Check the marketplace card and README excerpt." },
          { label: "5", title: "Publish", body: "Save an unlisted, private, or public version." },
        ]}
      />

      <FeatureWalkthrough
        title="Builder turns an idea or uploaded package into a marketplace skill."
        description="Use this page to create the skill record, normalize SKILL.md formatting, attach package files, choose permissions, and publish a version that can appear in My Skills or Marketplace."
        example="Upload a folder with SKILL.md, README, scripts, references, and assets. Then click Parse / suggest edits before publishing."
        why="Good skills need a clear workflow, explicit permissions, examples, and compatibility targets so users know when to trust and run them."
        items={[
          {
            title: "Metadata",
            body: "Name, slug, category, summary, and visibility decide how the skill appears and who can find it.",
          },
          {
            title: "Package upload",
            body: "Use .md, .skill, .zip, or folder upload to bring in the real skill files instead of typing everything manually.",
          },
          {
            title: "SKILL.md editor",
            body: "This is the source of truth for the agent instructions: workflow, permissions, examples, and compatibility.",
          },
          {
            title: "Validation",
            body: "Warnings show what is missing. Suggested formatting can repair common structure issues before publish.",
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <Panel className="p-4">
          <div className="grid grid-cols-4 gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-center text-xs font-semibold text-neutral-700">
            {["Upload", "Format", "Validate", "Publish"].map((step) => (
              <div key={step} className="rounded bg-white px-2 py-2">{step}</div>
            ))}
          </div>
          <h2 className="mt-5 text-base font-semibold text-neutral-950">Metadata</h2>
          <div className="mt-5 flex flex-col gap-4">
            <Field
              error={name.trim().length > 64 || name.trim().length < 4}
              helper="4-64 characters. This becomes the marketplace card title."
              label="Name"
              maxLength={64}
              testId="builder-name"
              value={name}
              onChange={setName}
            />
            <Field
              error={!/^[a-z0-9-]+$/.test(slug)}
              helper="Lowercase letters, numbers, and hyphens only."
              label="Slug"
              testId="builder-slug"
              value={slug}
              onChange={setSlug}
            />
            <Field
              helper="Use a short grouping such as Research, Reliability, Security, or Automation."
              label="Category"
              testId="builder-category"
              value={category}
              onChange={setCategory}
            />
            <Field
              error={summary.trim().length > 1024 || summary.trim().length < 40}
              helper="40-1024 characters. Explain what the skill does and when to use it."
              label="Summary"
              maxLength={1024}
              testId="builder-summary"
              value={summary}
              onChange={setSummary}
            />
            <label className="block text-sm font-medium text-neutral-700">
              Visibility
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as "public" | "private" | "unlisted")}
                data-testid="builder-visibility"
                className="mt-2 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13px] outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
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
              labels={permissionLabels}
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
          <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <div className="font-semibold text-neutral-950">Upload Skill Package</div>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Upload `.md`, `.skill`, `.zip`, or a folder with docs, scripts, references, assets, and config.
            </p>
            <label className="mt-4 block rounded-md border border-dashed border-neutral-300 bg-white p-3 text-sm text-neutral-700 transition hover:border-neutral-950">
              <span className="font-semibold text-neutral-950">File / zip</span>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">Accepts `.md`, `.skill`, and `.zip` packages.</span>
              <input accept=".md,.markdown,.skill,.zip,text/markdown,text/plain,application/zip" type="file" onChange={uploadSkillFile} data-testid="builder-file-upload" className="mt-3 block w-full text-xs" />
            </label>
            <label className="mt-3 block rounded-md border border-dashed border-neutral-300 bg-white p-3 text-sm text-neutral-700 transition hover:border-neutral-950">
              <span className="font-semibold text-neutral-950">Folder</span>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">Preserves nested docs, references, scripts, configs, and assets.</span>
              <input
                type="file"
                multiple
                onChange={uploadSkillFile}
                data-testid="builder-folder-upload"
                className="mt-3 block w-full text-xs"
                {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              />
            </label>
          </div>
          {uploadError ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">{uploadError}</div>
          ) : null}
          {uploadedFileName ? (
            <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              Uploaded: <span className="font-mono text-neutral-950">{uploadedFileName}</span>
              {packageUploadId ? <div className="mt-1 font-mono text-neutral-500">Package: {packageUploadId}</div> : null}
            </div>
          ) : null}
          {packageFiles.length ? (
            <div className="mt-3 rounded-md border border-neutral-200 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Package preview</div>
              <div className="mt-3 max-h-44 overflow-auto rounded-md border border-neutral-200">
                {packageFiles.map((file) => (
                  <div key={file.path} className="grid grid-cols-[1fr_76px_72px] gap-2 border-b border-neutral-100 px-3 py-2 text-xs last:border-b-0">
                    <span className="truncate font-mono text-neutral-950">{file.path}</span>
                    <span className="text-neutral-500">{file.role}</span>
                    <span className="text-right text-neutral-500">{file.size.toLocaleString()} B</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text.trim()) {
                  setSkillMd(text);
                  await importSkill(text);
                }
              } catch {
                document.getElementById("builder-skill-md")?.focus();
              }
            }}
            className="mt-6 block w-full rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-left text-sm text-neutral-700 transition hover:border-neutral-950 hover:bg-white cursor-pointer"
          >
            <span className="font-semibold text-neutral-950">Paste SKILL.md</span>
            <span className="mt-1 block text-xs leading-5 text-neutral-500">
              Click to paste from clipboard, then parse and suggest edits before publishing.
            </span>
          </button>
          <button
            onClick={() => importSkill()}
            data-testid="builder-parse"
            className="mt-6 h-10 w-full rounded-md border border-neutral-300 bg-white text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            Parse / suggest edits
          </button>
        </Panel>

        <Panel className="min-w-0 p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-neutral-950">
              {viewMode === "markdown" ? "SKILL.md editor" : "AI Elements Canvas"}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex rounded-md border border-neutral-300 bg-neutral-100 p-1">
                <button
                  onClick={() => setViewMode("markdown")}
                  className={`rounded px-3 py-1 text-xs font-semibold transition ${
                    viewMode === "markdown"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  Markdown
                </button>
                <button
                  onClick={() => setViewMode("canvas")}
                  className={`rounded px-3 py-1 text-xs font-semibold transition ${
                    viewMode === "canvas"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  Canvas
                </button>
              </div>
              <Badge tone={issues.length ? "amber" : "green"}>{issues.length ? "needs review" : "valid"}</Badge>
            </div>
          </div>
          
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <Sparkles className="size-4" />
                AI Skill Copilot
              </div>
              <select
                value={copilotModel}
                onChange={(e) => setCopilotModel(e.target.value)}
                className="h-8 rounded-md border border-blue-200 bg-white px-2 text-xs font-medium text-blue-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="grok-2-latest">Grok 2</option>
              </select>
            </div>
            <p className="mt-2 text-sm text-blue-800">Describe the skill you want to build and the AI will draft the markdown for you.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={copilotPrompt}
                onChange={(e) => setCopilotPrompt(e.target.value)}
                placeholder="e.g. A skill that helps debug Postgres connection limits..."
                className="h-10 flex-1 rounded-md border border-blue-200 bg-white px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && copilotPrompt && !isGenerating) {
                    complete(copilotPrompt);
                  }
                }}
              />
              <button
                onClick={() => complete(copilotPrompt)}
                disabled={!copilotPrompt || isGenerating}
                className="flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? "Drafting..." : "Generate Draft"}
              </button>
            </div>
          </div>

          <div className="mt-4 min-h-[620px] w-full overflow-hidden rounded-md border bg-white text-sm outline-none  focus-within:ring-2 focus-within:ring-neutral-200 focus-within:border-neutral-400 transition-all">
            {viewMode === "markdown" ? (
              <Editor
                value={skillMd}
                onValueChange={(code) => setSkillMd(code)}
                highlight={(code) => Prism.highlight(code, Prism.languages.markdown, "markdown")}
                padding={16}
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: 14,
                  lineHeight: "1.5",
                  minHeight: "620px",
                }}
                textareaId="builder-skill-md"
                textareaClassName="focus:outline-none"
              />
            ) : (
              <CanvasEditor />
            )}
          </div>
          <details className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-neutral-950">Preview rendered SKILL.md</summary>
            <div className="mt-4 max-h-[420px] overflow-auto rounded-md border border-neutral-200 bg-white p-4">
              <SafeMessageResponse>{skillMd}</SafeMessageResponse>
            </div>
          </details>
        </Panel>

        <div className="flex flex-col gap-6 lg:col-span-2 2xl:col-span-1">
          <Panel className="p-4">
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
                  <div>
                    Parsed import: {importResult.permissions.length} permission(s), {importResult.compatibilityTargets.length} target(s),{" "}
                    {importResult.issues.length} warning(s).
                  </div>
                  {importResult.suggestions.length ? (
                    <div className="mt-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Suggested edits</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {importResult.suggestions.map((suggestion) => (
                          <li key={suggestion}>{suggestion}</li>
                        ))}
                      </ul>
                      <button
                        onClick={applySuggestedSkillMd}
                        data-testid="builder-apply-suggestions"
                        className="mt-3 h-9 rounded-md border border-neutral-950 bg-neutral-950 px-3 text-xs font-semibold text-white transition hover:bg-neutral-800"
                      >
                        Apply suggested formatting
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-2 text-xs font-medium text-green-800">
                      Format matches the required SKILL.md structure.
                    </div>
                  )}
                </div>
              ) : null}
              {publishedSlug ? (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  Saved. View it at /skills/{publishedSlug} or find it in the marketplace.
                  {savedUrls ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a className="rounded-md border border-neutral-950 bg-neutral-950 px-2 py-1 text-xs font-semibold text-white" href={`${savedUrls.run}?mode=autopilot`}>⚡ Quick Run</a>
                      <a className="rounded-md border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-900" href={savedUrls.detail}>Detail</a>
                      <a className="rounded-md border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-900" href={savedUrls.mySkills}>My Skills</a>
                      <a className="rounded-md border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-900" href={savedUrls.run}>Run</a>
                      <a className="rounded-md border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-900" href={savedUrls.edit}>Edit</a>
                      {visibility === "public" ? (
                        <a className="rounded-md border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-900" href={savedUrls.marketplace}>Marketplace</a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {saveError ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{saveError}</div>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-4">
            <h2 className="font-semibold text-neutral-950">Live marketplace preview</h2>
            <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
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

          <Panel className="p-4">
            <h2 className="font-semibold text-neutral-950">Test skill</h2>
            <div className="mt-4 flex gap-2">
              <input
                value={testInput}
                onChange={(event) => setTestInput(event.target.value)}
                data-testid="builder-test-input"
                className="h-10 flex-1 rounded-md border px-3 text-sm outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isTesting) runTest();
                }}
              />
              <button
                onClick={runTest}
                disabled={isTesting || !testInput.trim()}
                className="flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {isTesting ? "Testing..." : "Run test"}
              </button>
            </div>
            <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">test output</div>
                {testRun?.status && <Badge tone={testRun.status === "failed" ? "red" : testRun.status === "complete" ? "green" : "amber"}>{testRun.status}</Badge>}
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-600 min-h-6">
                {testRun?.output || (isTesting ? "Streaming..." : "Enter a test prompt to preview output.")}
              </p>
            </div>
          </Panel>

          <Panel className="p-4">
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

function Field({
  error = false,
  helper,
  label,
  maxLength,
  testId,
  value,
  onChange,
}: {
  error?: boolean;
  helper?: string;
  label: string;
  maxLength?: number;
  testId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {maxLength ? (
          <span className={`font-mono text-xs ${value.length > maxLength ? "text-red-600" : "text-neutral-500"}`}>
            {value.length}/{maxLength}
          </span>
        ) : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className={`mt-2 h-9 w-full rounded-md border px-3 text-[13px] outline-none transition-all ${
          error ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100" : "border-neutral-200 bg-white focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
        }`}
      />
      {helper ? <span className={`mt-1 block text-xs ${error ? "text-red-700" : "text-neutral-500"}`}>{helper}</span> : null}
    </label>
  );
}

function Checklist({
  title,
  values,
  labels,
  selected,
  toggle,
}: {
  title: string;
  values: readonly string[];
  labels?: Record<string, string>;
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
            data-testid={`builder-toggle-${value.toLowerCase().replaceAll(" ", "-")}`}
            className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
              selected.includes(value)
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {labels?.[value] ?? value}
          </button>
        ))}
      </div>
    </div>
  );
}
