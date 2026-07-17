"use client";

import dynamic from "next/dynamic";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { executeSkillRunStream } from "@/lib/runner";
import { compatibilityTargets, permissionKeys, permissionLabels } from "@/lib/data";
import { parseSkillMarkdown } from "@/lib/skill-import";
import type { ParsedSkillImport, SkillDraftInput, SkillPackageFile, SkillRun } from "@/lib/types";
import { SafeMessageResponse } from "./safe-message-response";
import { ApiSettingsModal } from "./api-settings-modal";
import { BuilderStudio } from "./builder/builder-ui";
import { BuilderHeader } from "./builder/builder-header";
import { BuilderConfiguration } from "./builder/builder-configuration";
import { BuilderEditor, type BuilderChatMessage } from "./builder/builder-editor";
import { BuilderInspector } from "./builder/builder-inspector";
import type { BuilderSavedUrls, BuilderViewMode, BuilderVisibility } from "./builder/builder-types";

const CanvasEditor = dynamic(() => import("./canvas-editor").then((mod) => mod.CanvasEditor), { ssr: false });
const MarkdownEditor = dynamic(() => import("./markdown-editor"), { ssr: false });

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
  const [summary, setSummary] = useState(initialDraft?.summary ?? "Turns logs, traces, commits, and alerts into a source-backed incident timeline.");
  const [skillMd, setSkillMd] = useState(initialDraft?.skillMd ?? starterSkill);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialDraft?.permissions ?? ["read_files", "write_files", "network", "shell"]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>(initialDraft?.compatibilityTargets ?? ["Codex", "Claude", "VS Code"]);
  const [visibility, setVisibility] = useState<BuilderVisibility>(initialDraft?.visibility ?? "public");
  const [testInput, setTestInput] = useState("Create a postmortem from a failed deployment trace.");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [importResult, setImportResult] = useState<ParsedSkillImport | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [packageUploadId, setPackageUploadId] = useState(initialDraft?.packageUploadId ?? "");
  const [packageFiles, setPackageFiles] = useState<SkillPackageFile[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedUrls, setSavedUrls] = useState<BuilderSavedUrls | null>(null);
  const [testRun, setTestRun] = useState<SkillRun | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [viewMode, setViewMode] = useState<BuilderViewMode>("markdown");
  const [copilotModel, setCopilotModel] = useState("google/gemini-2.5-pro");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/skills/generate",
      body: { model: copilotModel },
      headers: { "x-api-keys": typeof window !== "undefined" ? localStorage.getItem("ai_api_keys") || "{}" : "{}" },
    }),
  });

  const isGenerating = status === "streaming" || status === "submitted";

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.parts) return;
    for (const part of lastMessage.parts) {
      if (part.type === "tool-update_skill_markdown") {
        const args = part.input as { markdown?: string };
        if (args?.markdown && args.markdown !== skillMd) {
          setSkillMd(args.markdown);
          void importSkill(args.markdown);
        }
      }
    }
  }, [messages, skillMd]);

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

  function toggle(value: string, selected: string[], setter: (value: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  async function importSkill(nextSkillMd = skillMd) {
    setUploadError("");
    const response = await fetch("/api/skills/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ skillMd: nextSkillMd }) });
    const payload = (await response.json().catch(() => null)) as (ParsedSkillImport & { error?: string }) | null;
    const localParsed = parseSkillMarkdown(nextSkillMd);
    const parsed = response.ok && payload ? payload : { ...localParsed, suggestions: [...localParsed.suggestions, response.status === 401 ? "Sign in to save, upload package files, or publish. Local formatting suggestions are available now." : "The server parser was unavailable, so local formatting suggestions are shown."] };
    if (!response.ok) setUploadError(payload?.error ?? "Server parser unavailable. Showing local formatting suggestions.");
    setImportResult(parsed);
    setName(parsed.name); setSlug(parsed.slug); setCategory(parsed.category); setSummary(parsed.description);
    setSelectedPermissions(parsed.permissions); setSelectedTargets(parsed.compatibilityTargets);
    if (parsed.packageUploadId) setPackageUploadId(parsed.packageUploadId);
    if (parsed.packageFiles) setPackageFiles(parsed.packageFiles);
  }

  async function uploadSkillFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploadError("");
    const form = new FormData();
    for (const file of files) form.append("files", file, (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name);
    const response = await fetch("/api/skills/upload", { method: "POST", body: form });
    const payload = (await response.json()) as ParsedSkillImport & { error?: string };
    if (!response.ok) { setUploadError(payload.error ?? "Upload failed."); event.target.value = ""; return; }
    setUploadedFileName(files.length === 1 ? files[0].name : `${files.length} files`);
    setImportResult(payload); setPackageUploadId(payload.packageUploadId ?? ""); setPackageFiles(payload.packageFiles ?? []);
    setSkillMd(payload.primarySkillMd ?? payload.suggestedSkillMd); setName(payload.name); setSlug(payload.slug); setCategory(payload.category); setSummary(payload.description);
    setSelectedPermissions(payload.permissions); setSelectedTargets(payload.compatibilityTargets); event.target.value = "";
  }

  function applySuggestedSkillMd() {
    if (!importResult) return;
    setSkillMd(importResult.suggestedSkillMd); setName(importResult.name); setSlug(importResult.slug); setCategory(importResult.category); setSummary(importResult.description);
    setSelectedPermissions(importResult.permissions); setSelectedTargets(importResult.compatibilityTargets);
  }

  async function publishSkill() {
    setSaveError(""); setSavedUrls(null); setIsSaving(true);
    const response = await fetch("/api/skills", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, slug, category, summary, skillMd, permissions: selectedPermissions, compatibilityTargets: selectedTargets, visibility, packageUploadId: packageUploadId || undefined }) });
    const payload = (await response.json()) as { skill?: { slug: string }; urls?: BuilderSavedUrls; error?: string };
    if (response.ok && payload.skill && payload.urls) { setPublishedSlug(payload.skill.slug); setSavedUrls(payload.urls); } else setSaveError(payload.error ?? "Skill save failed.");
    setIsSaving(false);
  }

  async function runTest() {
    const prompt = testInput.trim();
    if (!prompt || isTesting) return;
    setIsTesting(true); setTestRun(null);
    await executeSkillRunStream({
      skillSlug: "agent-observer", input: prompt, deniedPermissions: [],
      onRun: setTestRun,
      onEvent: (event) => setTestRun((current) => current ? { ...current, events: [...current.events.filter((item) => item.order !== event.order), event].sort((a, b) => a.order - b.order) } : current),
      onOutput: (output) => setTestRun((current) => current ? { ...current, output } : null),
      onComplete: setTestRun,
      onError: (message) => setTestRun((current) => current ? { ...current, status: "failed", output: message } : null),
    });
    setIsTesting(false);
  }

  async function pasteSkill() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) { setSkillMd(text); await importSkill(text); }
    } catch { document.getElementById("builder-skill-md")?.focus(); }
  }

  function submitCopilot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || isGenerating) return;
    sendMessage({ text: input }); setInput("");
  }

  return (
    <BuilderStudio>
      <BuilderHeader issueCount={issues.length} isSaving={isSaving} onOpenSettings={() => setIsSettingsOpen(true)} onPublish={publishSkill} />
      <div className="builder-workspace-grid">
        <BuilderConfiguration
          name={name} slug={slug} category={category} summary={summary} visibility={visibility}
          permissions={selectedPermissions} targets={selectedTargets} permissionValues={permissionKeys}
          targetValues={compatibilityTargets} permissionLabels={permissionLabels} packageFiles={packageFiles}
          packageUploadId={packageUploadId} uploadedFileName={uploadedFileName} uploadError={uploadError}
          onNameChange={setName} onSlugChange={setSlug} onCategoryChange={setCategory} onSummaryChange={setSummary}
          onVisibilityChange={setVisibility} onPermissionToggle={(value) => toggle(value, selectedPermissions, setSelectedPermissions)}
          onTargetToggle={(value) => toggle(value, selectedTargets, setSelectedTargets)} onUpload={uploadSkillFile}
          onPaste={pasteSkill} onParse={() => void importSkill()}
        />
        <BuilderEditor
          viewMode={viewMode} issueCount={issues.length} copilotModel={copilotModel}
          messages={messages as BuilderChatMessage[]} input={input} isGenerating={isGenerating}
          editor={viewMode === "markdown" ? <MarkdownEditor value={skillMd} onValueChange={setSkillMd} textareaId="builder-skill-md" textareaClassName="focus:outline-none" /> : <CanvasEditor />}
          preview={<SafeMessageResponse>{skillMd}</SafeMessageResponse>}
          onViewModeChange={setViewMode} onModelChange={setCopilotModel} onInputChange={setInput} onSubmit={submitCopilot}
        />
        <BuilderInspector
          issues={issues} importResult={importResult} publishedSlug={publishedSlug} savedUrls={savedUrls}
          saveError={saveError} visibility={visibility} name={name} category={category} summary={summary}
          permissions={selectedPermissions} targets={selectedTargets} testInput={testInput} testRun={testRun}
          isTesting={isTesting} onApplySuggestions={applySuggestedSkillMd} onTestInputChange={setTestInput} onRunTest={() => void runTest()}
        />
      </div>
      <ApiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </BuilderStudio>
  );
}
