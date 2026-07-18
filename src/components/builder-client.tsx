"use client";

import dynamic from "next/dynamic";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  FileArchive,
  FileText,
  FolderOpen,
  KeyRound,
  PackageCheck,
  Play,
  Rocket,
  Save,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { executeSkillRunStream } from "@/lib/runner";
import { compatibilityTargets, permissionKeys, permissionLabels } from "@/lib/data";
import { inferSkillTestPrompt, parseSkillMarkdown } from "@/lib/skill-import";
import { FULL_PACKAGE_REQUIRED_SECTIONS } from "@/lib/skill-package-profile";
import type {
  CompatibilityTarget,
  ParsedSkillImport,
  PermissionKey,
  SkillDraftInput,
  SkillPackageFile,
  SkillRun,
} from "@/lib/types";
import { SafeMessageResponse } from "./safe-message-response";
import { ApiSettingsModal } from "./api-settings-modal";
import { BuilderStudio, BuilderField, BuilderSectionLabel, BuilderStatus } from "./builder/builder-ui";
import { BuilderEditor } from "./builder/builder-editor";
import { BuilderCopilot, type BuilderCopilotMessage } from "./builder/builder-copilot";
import type { BuilderSavedUrls, BuilderViewMode, BuilderVisibility } from "./builder/builder-types";
import { Badge } from "./ui";

const CanvasEditor = dynamic(() => import("./canvas-editor").then((mod) => mod.CanvasEditor), { ssr: false });
const MarkdownEditor = dynamic(() => import("./markdown-editor"), { ssr: false });

type BuilderPath = "create" | "import" | null;
type BuilderStep = "source" | "instructions" | "package" | "configuration" | "test" | "finish";

const modelOptions = [
  ["google/gemini-2.5-flash", "Gemini 2.5 Flash"],
  ["google/gemini-2.5-pro", "Gemini 2.5 Pro"],
  ["xai/grok-4.3", "Grok 4.3"],
  ["xai/grok-4.5", "Grok 4.5"],
  ["groq/llama-3.3-70b-versatile", "Llama 3.3 (Groq)"],
  ["groq/mixtral-8x7b-32768", "Mixtral (Groq)"],
  ["deepseek/deepseek-v4-flash", "DeepSeek V4 Flash"],
  ["deepseek/deepseek-v4-pro", "DeepSeek V4 Pro"],
  ["openai/gpt-4o", "GPT-4o"],
  ["anthropic/claude-3-5-sonnet-20240620", "Claude 3.5 Sonnet"],
] as const;

const createSteps: BuilderStep[] = ["source", "instructions", "package", "configuration", "test", "finish"];
const importSteps: BuilderStep[] = ["source", "package", "instructions", "configuration", "test", "finish"];
const stepLabels: Record<BuilderStep, string> = {
  source: "Start",
  instructions: "Instructions",
  package: "Package",
  configuration: "Configuration",
  test: "Validate and test",
  finish: "Finish",
};

const starterSkill = `---
name: incident-postmortem-assistant
description: >-
  Use this skill when the user needs to turn logs, traces, commits, and alerts into an incident timeline, root-cause hypotheses, and a reviewable postmortem draft.
license: MIT
compatibility: No external runtime dependencies. Network access is optional for approved incident references.
metadata:
  author: marketplace-user
  version: "1.0.0"
  targets:
    - Codex
    - Claude
    - VS Code
allowed-tools:
  - read_files
  - write_files
  - network
---

# Incident Postmortem Assistant

## Overview
Builds a source-backed incident timeline and postmortem draft from operational evidence.

## Activation
Use when the user asks to investigate an outage, reconstruct an incident, or draft a postmortem.

## Required Inputs
Request logs, alerts, trace snippets, relevant commits, and the known incident window.

## Workflow
1. Ingest the supplied evidence.
2. Build a timeline with confidence labels.
3. Identify likely root causes and evidence gaps.
4. Draft corrective actions with owners and verification checks.

## Output Contract
Return a timeline, impact summary, root-cause analysis, unresolved questions, and corrective actions.

## Available Scripts
No bundled scripts are required for the default workflow.

## References
Read \`references/REFERENCE.md\` when the user supplies provider-specific incident documentation or error codes.

## Safety and Permissions
Use only approved files and network references. Do not expose secrets found in logs.

## Failure Handling
State which evidence is missing and avoid presenting uncertain hypotheses as confirmed facts.

## Gotchas
Clock skew and partial traces can make event ordering unreliable.

## Examples
- "Create a postmortem from this deployment trace and alert timeline."
- "Review these incident notes and produce root-cause hypotheses with confidence labels."

## Validation
Verify that every major claim points to supplied evidence and that action items are measurable.

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
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialDraft?.permissions ?? ["read_files", "write_files", "network"]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>(initialDraft?.compatibilityTargets ?? ["Codex", "Claude", "VS Code"]);
  const [visibility, setVisibility] = useState<BuilderVisibility>(initialDraft?.visibility ?? "public");
  const [testInput, setTestInput] = useState(() => inferSkillTestPrompt(initialDraft?.skillMd ?? starterSkill));
  const [publishedSlug, setPublishedSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [importResult, setImportResult] = useState<ParsedSkillImport | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [packageUploadId, setPackageUploadId] = useState(initialDraft?.packageUploadId ?? "");
  const [packageFiles, setPackageFiles] = useState<SkillPackageFile[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [packageError, setPackageError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedUrls, setSavedUrls] = useState<BuilderSavedUrls | null>(null);
  const [testRun, setTestRun] = useState<SkillRun | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [viewMode, setViewMode] = useState<BuilderViewMode>("markdown");
  const [copilotModel, setCopilotModel] = useState("google/gemini-2.5-flash");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [input, setInput] = useState("");
  const [copilotError, setCopilotError] = useState("");
  const [builderPath, setBuilderPath] = useState<BuilderPath>(initialDraft ? "create" : null);
  const [activeStep, setActiveStep] = useState<BuilderStep>(initialDraft ? "instructions" : "source");
  const [draftSaved, setDraftSaved] = useState(false);
  const [downloadedPackage, setDownloadedPackage] = useState("");
  const [activeApiKey, setActiveApiKey] = useState(false);

  const copilotStateRef = useRef({
    model: copilotModel,
    currentSkill: skillMd,
    currentFiles: packageFiles,
    apiKeys: typeof window !== "undefined" ? localStorage.getItem("ai_api_keys") || "{}" : "{}",
  });

  useEffect(() => {
    const apiKeys = typeof window !== "undefined" ? localStorage.getItem("ai_api_keys") || "{}" : "{}";
    copilotStateRef.current = { model: copilotModel, currentSkill: skillMd, currentFiles: packageFiles, apiKeys };
    setActiveApiKey(hasKeyForModel(copilotModel, apiKeys));
  }, [copilotModel, packageFiles, settingsRevision, skillMd]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/skills/generate",
    fetch: async (url, init) => {
      const state = copilotStateRef.current;
      const body = JSON.parse((init?.body as string) || "{}");
      body.model = state.model;
      body.currentSkill = state.currentSkill;
      body.currentFiles = state.currentFiles;
      return fetch(url, {
        ...init,
        body: JSON.stringify(body),
        headers: { ...init?.headers, "x-api-keys": state.apiKeys },
      });
    },
  }), []);

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    onError: (error) => setCopilotError(error.message || "Copilot could not complete the request."),
  });
  const isGenerating = status === "streaming" || status === "submitted";

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.parts) return;
    for (const part of lastMessage.parts) {
      if (part.type !== "tool-update_skill_markdown") continue;
      const toolPart = part as typeof part & {
        input?: {
          skillMd?: string;
          markdown?: string;
          files?: Array<{ path: string; content: string; role?: string }>;
          metadata?: GeneratedBuilderMetadata;
        };
        output?: {
          updatedContent?: string;
          packageUploadId?: string;
          packageFiles?: SkillPackageFile[];
          metadata?: GeneratedBuilderMetadata;
        };
      };
      const markdown = toolPart.output?.updatedContent ?? toolPart.input?.skillMd ?? toolPart.input?.markdown;
      const metadata = toolPart.output?.metadata ?? toolPart.input?.metadata;
      if (markdown && markdown !== skillMd) {
        setSkillMd(markdown);
        void importSkill(markdown);
        setViewMode("markdown");
      }
      if (toolPart.output?.packageFiles?.length) setPackageFiles(toolPart.output.packageFiles);
      if (toolPart.output?.packageUploadId) setPackageUploadId(toolPart.output.packageUploadId);
      if (metadata) applyGeneratedMetadata(metadata);
    }
  }, [messages, skillMd]);

  const issues = useMemo(() => {
    const next: string[] = [];
    const h1Count = (skillMd.match(/^#\s+.+$/gm) ?? []).length;
    if (name.trim().length < 4 || name.trim().length > 64) next.push("Name must use 4 to 64 characters.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) next.push("Slug must use lowercase letters, numbers, and single hyphens.");
    if (summary.trim().length < 40 || summary.trim().length > 1024) next.push("Summary must use 40 to 1024 characters.");
    if (!skillMd.trim().startsWith("---")) next.push("SKILL.md needs YAML frontmatter.");
    if (!/^description:\s*(?:.+|[>|][+-]?)$/im.test(skillMd)) next.push("SKILL.md frontmatter needs a description field.");
    if (!/^allowed-tools:\s*$/im.test(skillMd)) next.push("allowed-tools must be a top-level frontmatter field.");
    if (h1Count !== 1) next.push("SKILL.md needs exactly one human-readable H1 title.");
    for (const section of FULL_PACKAGE_REQUIRED_SECTIONS) {
      if (!new RegExp(`^##\\s+${escapeRegExp(section)}\\s*$`, "im").test(skillMd)) next.push(`SKILL.md needs a ## ${section} section.`);
    }
    if (selectedPermissions.length === 0) next.push("Select at least one permission.");
    if (selectedTargets.length === 0) next.push("Select at least one install target.");
    return next;
  }, [name, selectedPermissions.length, selectedTargets.length, skillMd, slug, summary]);

  const orderedSteps = builderPath === "import" ? importSteps : createSteps;
  const currentStepIndex = orderedSteps.indexOf(activeStep);
  const providerLabel = providerForModel(copilotModel);

  function toggle(value: string, selected: string[], setter: (value: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  function choosePath(path: Exclude<BuilderPath, null>) {
    setBuilderPath(path);
    if (path === "create") {
      setPackageFiles([]);
      setPackageUploadId("");
      setUploadedFileName("");
      setImportResult(null);
    }
    setActiveStep(path === "create" ? "instructions" : "source");
  }

  function goRelative(direction: -1 | 1) {
    const target = orderedSteps[currentStepIndex + direction];
    if (target) setActiveStep(target);
  }

  function applyGeneratedMetadata(metadata: GeneratedBuilderMetadata) {
    if (metadata.displayName) setName(metadata.displayName);
    if (metadata.directoryName) setSlug(metadata.directoryName);
    if (metadata.category) setCategory(metadata.category);
    if (metadata.summary) setSummary(metadata.summary);
    if (metadata.testPrompt) setTestInput(metadata.testPrompt);
    if (metadata.permissions?.length) setSelectedPermissions(metadata.permissions);
    if (metadata.targets?.length) setSelectedTargets(metadata.targets);
  }

  function applyParsedSkill(parsed: ParsedSkillImport, sourceSkillMd: string) {
    setImportResult(parsed);
    setName(parsed.name);
    setSlug(parsed.slug);
    setCategory(parsed.category);
    setSummary(parsed.description);
    setSelectedPermissions(parsed.permissions);
    setSelectedTargets(parsed.compatibilityTargets);
    setTestInput(inferSkillTestPrompt(sourceSkillMd));
    if (parsed.packageUploadId) setPackageUploadId(parsed.packageUploadId);
    if (parsed.packageFiles) setPackageFiles(parsed.packageFiles);
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
    const parsed = response.ok && payload ? payload : {
      ...localParsed,
      suggestions: [
        ...localParsed.suggestions,
        response.status === 401
          ? "Sign in to persist packages or publish. Local analysis is still available."
          : "The server parser was unavailable, so local analysis is shown.",
      ],
    };
    if (!response.ok) setUploadError(payload?.error ?? "Server parser unavailable. Showing local analysis.");
    applyParsedSkill(parsed, nextSkillMd);
  }

  async function uploadSkillFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setBuilderPath("import");
    setUploadError("");
    const form = new FormData();
    for (const file of files) form.append("files", file, (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name);
    const response = await fetch("/api/skills/upload", { method: "POST", body: form });
    const payload = (await response.json()) as ParsedSkillImport & { error?: string };
    if (!response.ok) {
      setUploadError(payload.error ?? "Upload failed.");
      event.target.value = "";
      return;
    }
    const importedSkillMd = payload.primarySkillMd ?? payload.suggestedSkillMd;
    setUploadedFileName(files.length === 1 ? files[0].name : `${files.length} files`);
    setPackageUploadId(payload.packageUploadId ?? "");
    setPackageFiles(payload.packageFiles ?? []);
    setSkillMd(importedSkillMd);
    applyParsedSkill(payload, importedSkillMd);
    setActiveStep("package");
    event.target.value = "";
  }

  async function pasteSkill() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      setBuilderPath("import");
      setSkillMd(text);
      await importSkill(text);
      setActiveStep("package");
    } catch {
      setBuilderPath("import");
      setActiveStep("instructions");
      document.getElementById("builder-skill-md")?.focus();
    }
  }

  function applySuggestedSkillMd() {
    if (!importResult) return;
    setSkillMd(importResult.suggestedSkillMd);
    applyParsedSkill(importResult, importResult.suggestedSkillMd);
  }

  async function syncPackage() {
    setIsPackaging(true);
    setPackageError("");
    try {
      const response = await fetch("/api/skills/package", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skillMd,
          files: packageFiles,
          metadata: {
            displayName: name,
            directoryName: slug,
            category,
            summary,
            testPrompt: testInput,
            permissions: selectedPermissions,
            targets: selectedTargets,
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as PackageResponse | null;
      if (payload?.skillMd) setSkillMd(payload.skillMd);
      if (payload?.packageUploadId) setPackageUploadId(payload.packageUploadId);
      const files = payload?.files?.length ? payload.files : payload?.packageFiles ?? [];
      if (files.length) setPackageFiles(files);
      if (!response.ok || !payload) throw new Error(payload?.error ?? "Package generation failed.");
      return files;
    } catch (error) {
      setPackageError(error instanceof Error ? error.message : "Package generation failed.");
      return [];
    } finally {
      setIsPackaging(false);
    }
  }

  async function downloadZip() {
    const files = await syncPackage();
    if (!files.length) return;
    setIsPackaging(true);
    setPackageError("");
    try {
      const zip = new JSZip();
      const root = zip.folder(slug || "agent-skill");
      if (!root) throw new Error("Could not create the package folder.");
      for (const file of files) {
        if (file.path.endsWith("/.gitkeep")) {
          root.file(file.path, "");
          continue;
        }
        if (file.content !== undefined) {
          root.file(file.path, file.content);
          continue;
        }
        if (file.blobUrl) {
          const response = await fetch(file.blobUrl);
          if (!response.ok) throw new Error(`Could not download ${file.path}.`);
          root.file(file.path, await response.arrayBuffer());
        }
      }
      if (!files.some((file) => file.path === "SKILL.md")) root.file("SKILL.md", skillMd);
      const blob = await zip.generateAsync({ type: "blob" });
      const filename = `${slug || "agent-skill"}.zip`;
      saveAs(blob, filename);
      setDownloadedPackage(filename);
    } catch (error) {
      setPackageError(error instanceof Error ? error.message : "ZIP export failed.");
    } finally {
      setIsPackaging(false);
    }
  }

  function saveDraft() {
    const draft: SkillDraftInput = {
      name,
      slug,
      category,
      summary,
      skillMd,
      permissions: selectedPermissions as PermissionKey[],
      compatibilityTargets: selectedTargets as CompatibilityTarget[],
      visibility,
      packageUploadId: packageUploadId || undefined,
    };
    localStorage.setItem(`skill-builder-draft:${slug}`, JSON.stringify({ draft, packageFiles, savedAt: new Date().toISOString() }));
    setDraftSaved(true);
    window.setTimeout(() => setDraftSaved(false), 2500);
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
    const payload = (await response.json()) as { skill?: { slug: string }; urls?: BuilderSavedUrls; error?: string };
    if (response.ok && payload.skill && payload.urls) {
      setPublishedSlug(payload.skill.slug);
      setSavedUrls(payload.urls);
    } else setSaveError(payload.error ?? "Skill save failed.");
    setIsSaving(false);
  }

  async function runTest() {
    const prompt = testInput.trim();
    if (!prompt || isTesting) return;
    setIsTesting(true);
    setTestRun(null);
    await executeSkillRunStream({
      skillSlug: slug,
      draftSkill: {
        name,
        slug,
        category,
        summary,
        skillMd,
        permissions: selectedPermissions as PermissionKey[],
        compatibilityTargets: selectedTargets as CompatibilityTarget[],
        visibility,
        packageUploadId: packageUploadId || undefined,
      },
      input: prompt,
      deniedPermissions: [],
      provider: sandboxProviderForModel(copilotModel),
      onRun: setTestRun,
      onEvent: (event) => setTestRun((current) => current ? {
        ...current,
        events: [...current.events.filter((item) => item.order !== event.order), event].sort((a, b) => a.order - b.order),
      } : current),
      onOutput: (output) => setTestRun((current) => current ? { ...current, output } : null),
      onComplete: setTestRun,
      onError: (message) => setTestRun((current) => current ? { ...current, status: "failed", output: message } : null),
    });
    setIsTesting(false);
  }

  function submitCopilot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || isGenerating) return;
    setCopilotError("");
    void sendMessage({ text: input });
    setInput("");
  }

  return (
    <BuilderStudio>
      <div className="builder-workbench-shell">
        <header className="builder-guided-header">
          <div className="min-w-0">
            <div className="builder-eyebrow">Skill Studio</div>
            <h1>Build a portable agent skill</h1>
            <p>Describe the skill, refine the package, then download or publish.</p>
          </div>
          <div className="builder-model-bar" aria-label="AI model and API key settings">
            <label>
              <span>AI model</span>
              <select value={copilotModel} onChange={(event) => setCopilotModel(event.target.value)}>
                {modelOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setIsSettingsOpen(true)} className={`builder-api-key-button ${activeApiKey ? "builder-api-key-active" : ""}`}>
              {activeApiKey ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <KeyRound className="size-4" aria-hidden="true" />}
              <span>{activeApiKey ? `${providerLabel} key active` : `Activate ${providerLabel} key`}</span>
            </button>
          </div>
        </header>

        {builderPath ? (
          <nav className="builder-progress" aria-label="Skill creation progress">
            {orderedSteps.map((step, index) => {
              const selected = activeStep === step;
              const complete = index < currentStepIndex;
              return (
                <button type="button" key={step} aria-current={selected ? "step" : undefined} onClick={() => setActiveStep(step)}>
                  <span className={`builder-progress-index ${complete ? "is-complete" : ""}`}>{complete ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}</span>
                  <span>{stepLabels[step]}</span>
                </button>
              );
            })}
          </nav>
        ) : null}

        <div className="builder-section-rule" role="separator" aria-hidden="true" />

        <main className="builder-guided-main">
          {activeStep !== "source" ? (
            <div className="builder-step-heading">
              <div>
                <div className="builder-eyebrow">Step {Math.max(1, currentStepIndex + 1)} of {orderedSteps.length}</div>
                <h2>{stepTitle(activeStep, builderPath)}</h2>
                <p>{stepDescription(activeStep, builderPath)}</p>
              </div>
              <button className="builder-secondary-button" type="button" onClick={() => { setBuilderPath(null); setActiveStep("source"); }}>Change path</button>
            </div>
          ) : null}

          {activeStep === "source" ? (
            <section className="builder-start-stack" aria-label="How to start">
              <article className="builder-start-primary">
                <div className="builder-start-copy">
                  <span className="builder-start-icon" aria-hidden="true"><WandSparkles className="size-5" /></span>
                  <div>
                    <div className="builder-eyebrow">Create new</div>
                    <h2>Start with an idea</h2>
                    <p>Describe the outcome. Copilot drafts SKILL.md, package files, metadata, and a test prompt.</p>
                  </div>
                </div>
                <button type="button" className="builder-primary-button" onClick={() => choosePath("create")}>
                  <Sparkles className="size-4" aria-hidden="true" />
                  Create with AI
                </button>
              </article>

              <div className="builder-section-rule" role="separator" aria-hidden="true" />

              <article className="builder-start-secondary">
                <div className="builder-start-copy">
                  <span className="builder-start-icon is-muted" aria-hidden="true"><Upload className="size-5" /></span>
                  <div>
                    <div className="builder-eyebrow">Import existing</div>
                    <h3>Upload a skill package</h3>
                    <p>Import SKILL.md, a ZIP or .skill package, or a folder. The Builder detects and repairs structure.</p>
                  </div>
                </div>
                <div className="builder-start-actions">
                  <label className="builder-secondary-button cursor-pointer">
                    <FileArchive className="size-4" aria-hidden="true" />
                    File or ZIP
                    <input className="sr-only" data-testid="builder-file-upload" accept=".md,.markdown,.skill,.zip,text/markdown,text/plain,application/zip" type="file" onChange={uploadSkillFile} />
                  </label>
                  <label className="builder-secondary-button cursor-pointer">
                    <FolderOpen className="size-4" aria-hidden="true" />
                    Folder
                    <input className="sr-only" data-testid="builder-folder-upload" type="file" multiple onChange={uploadSkillFile} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />
                  </label>
                  <button type="button" className="builder-secondary-button" onClick={() => { setBuilderPath("import"); void pasteSkill(); }}>
                    <FileText className="size-4" aria-hidden="true" />
                    Paste SKILL.md
                  </button>
                </div>
              </article>
              {uploadError ? <div className="builder-error-banner">{uploadError}</div> : null}
            </section>
          ) : null}

          {activeStep === "instructions" ? (
            <div className="builder-instructions-workbench">
              <BuilderCopilot
                messages={messages as BuilderCopilotMessage[]}
                input={input}
                model={copilotModel}
                isGenerating={isGenerating}
                error={copilotError}
                showControls={false}
                onInputChange={setInput}
                onModelChange={setCopilotModel}
                onSubmit={submitCopilot}
                onStop={() => void stop()}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
              <div className="builder-section-rule" role="separator" aria-hidden="true" />
              <BuilderEditor
                viewMode={viewMode}
                issueCount={issues.length}
                editor={viewMode === "markdown" ? <MarkdownEditor value={skillMd} onValueChange={setSkillMd} textareaId="builder-skill-md" textareaClassName="focus:outline-none" /> : <CanvasEditor />}
                preview={<SafeMessageResponse>{skillMd}</SafeMessageResponse>}
                onViewModeChange={setViewMode}
              />
            </div>
          ) : null}

          {activeStep === "package" ? (
            <section className="builder-band" aria-labelledby="builder-package-title">
              <header className="builder-band-header">
                <div>
                  <h3 id="builder-package-title">Skill package</h3>
                  <p>Review the exact files that will be downloaded or published.</p>
                </div>
                <button type="button" onClick={() => void syncPackage()} disabled={isPackaging} className="builder-primary-button">
                  <PackageCheck className="size-4" aria-hidden="true" />
                  {isPackaging ? "Building..." : "Generate missing files"}
                </button>
              </header>
              <div className="builder-upload-zone">
                <div>
                  <Upload className="size-5 text-primary" aria-hidden="true" />
                  <h4>Upload or add package files</h4>
                  <p>Existing files are preserved. Missing required directories are scaffolded automatically.</p>
                </div>
                <div className="builder-start-actions">
                  <label className="builder-secondary-button cursor-pointer"><FileArchive className="size-4" aria-hidden="true" />Add file or ZIP<input className="sr-only" accept=".md,.markdown,.skill,.zip,text/markdown,text/plain,application/zip" type="file" onChange={uploadSkillFile} /></label>
                  <label className="builder-secondary-button cursor-pointer"><FolderOpen className="size-4" aria-hidden="true" />Add folder<input className="sr-only" type="file" multiple onChange={uploadSkillFile} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} /></label>
                  <button type="button" className="builder-secondary-button" data-testid="builder-parse" onClick={() => void importSkill()}><WandSparkles className="size-4" aria-hidden="true" />Parse and repair</button>
                </div>
              </div>
              {uploadedFileName ? <div className="builder-info-banner">Imported <strong>{uploadedFileName}</strong>{packageUploadId ? ` · Package ${packageUploadId}` : ""}</div> : null}
              {packageError || uploadError ? <div className="builder-error-banner">{packageError || uploadError}</div> : null}
              <PackageTree slug={slug} files={packageFiles} skillMd={skillMd} />
            </section>
          ) : null}

          {activeStep === "configuration" ? (
            <div className="builder-step-stack">
              <section className="builder-band" aria-labelledby="builder-listing-title">
                <header className="builder-band-header">
                  <div>
                    <h3 id="builder-listing-title">Marketplace listing</h3>
                    <p>Control how the skill appears in search, detail pages, and My Skills.</p>
                  </div>
                </header>
                <div className="builder-form-grid">
                  <BuilderField label="Display name" helper={`${name.length}/64 characters`}><input className="builder-input" data-testid="builder-name" value={name} onChange={(event) => setName(event.target.value)} /></BuilderField>
                  <BuilderField label="Directory name" helper="Lowercase letters, numbers, and single hyphens."><input className="builder-input font-mono" data-testid="builder-slug" value={slug} onChange={(event) => setSlug(event.target.value)} /></BuilderField>
                  <BuilderField label="Category"><input className="builder-input" data-testid="builder-category" value={category} onChange={(event) => setCategory(event.target.value)} /></BuilderField>
                  <BuilderField label="Visibility"><select className="builder-input" data-testid="builder-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as BuilderVisibility)}><option value="public">Public</option><option value="private">Private</option><option value="unlisted">Unlisted</option></select></BuilderField>
                  <div className="sm:col-span-2"><BuilderField label="Summary" helper={`${summary.length}/1024 characters`}><textarea className="builder-textarea min-h-28" data-testid="builder-summary" value={summary} onChange={(event) => setSummary(event.target.value)} /></BuilderField></div>
                </div>
              </section>
              <div className="builder-section-rule" role="separator" aria-hidden="true" />
              <section className="builder-band" aria-labelledby="builder-access-title">
                <header className="builder-band-header">
                  <div>
                    <h3 id="builder-access-title">Access and compatibility</h3>
                    <p>Declare the permissions the skill uses and where users can install it.</p>
                  </div>
                </header>
                <div className="space-y-6">
                  <ToggleList title="Permissions" values={permissionKeys} labels={permissionLabels} selected={selectedPermissions} onToggle={(value) => toggle(value, selectedPermissions, setSelectedPermissions)} />
                  <ToggleList title="Install targets" values={compatibilityTargets} selected={selectedTargets} onToggle={(value) => toggle(value, selectedTargets, setSelectedTargets)} />
                </div>
              </section>
            </div>
          ) : null}

          {activeStep === "test" ? (
            <div className="builder-step-stack">
              <section className="builder-band" aria-labelledby="builder-validation-title">
                <header className="builder-band-header">
                  <div>
                    <h3 id="builder-validation-title">Profile validation</h3>
                    <p>Resolve blocking issues before downloading or publishing.</p>
                  </div>
                </header>
                <div className="space-y-2">{issues.length ? issues.map((issue) => <BuilderStatus key={issue} valid={false}>{issue}</BuilderStatus>) : <BuilderStatus valid>The Full Package Profile requirements are satisfied.</BuilderStatus>}</div>
                {importResult?.suggestions.length ? <div className="builder-import-analysis"><strong>Repair suggestions</strong><ul>{importResult.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul><button type="button" onClick={applySuggestedSkillMd} data-testid="builder-apply-suggestions" className="builder-secondary-button">Apply suggested formatting</button></div> : null}
              </section>
              <div className="builder-section-rule" role="separator" aria-hidden="true" />
              <section className="builder-band" aria-labelledby="builder-test-title">
                <header className="builder-band-header">
                  <div>
                    <h3 id="builder-test-title">Test the current draft</h3>
                    <p>This runs the unsaved Builder state, not a different marketplace skill.</p>
                  </div>
                </header>
                <div className="builder-test-controls">
                  <input value={testInput} onChange={(event) => setTestInput(event.target.value)} data-testid="builder-test-input" className="builder-input flex-1" onKeyDown={(event) => { if (event.key === "Enter" && !isTesting) void runTest(); }} />
                  <button type="button" onClick={() => void runTest()} disabled={isTesting || !testInput.trim()} className="builder-primary-button"><Play className="size-4" aria-hidden="true" />{isTesting ? "Running..." : "Run draft"}</button>
                </div>
                <div className="builder-test-output">
                  <div className="flex items-center justify-between gap-3">
                    <BuilderSectionLabel>Output</BuilderSectionLabel>
                    {testRun?.status ? <Badge tone={testRun.status === "failed" ? "red" : testRun.status === "complete" ? "green" : "amber"}>{testRun.status}</Badge> : null}
                  </div>
                  <p>{testRun?.output || (isTesting ? "Streaming the current draft..." : "Run a realistic prompt to verify the skill before finishing.")}</p>
                </div>
              </section>
            </div>
          ) : null}

          {activeStep === "finish" ? (
            <section className="builder-band" aria-labelledby="builder-finish-title">
              <header className="builder-band-header">
                <div>
                  <h3 id="builder-finish-title">Finish your skill</h3>
                  <p>Saving, downloading, and publishing are separate actions.</p>
                </div>
              </header>
              <div className="builder-finish-list">
                <FinishCard icon={<Save className="size-4" aria-hidden="true" />} title="Save browser draft" description="Keep the current Builder state in this browser without publishing." action={<button type="button" className="builder-secondary-button" onClick={saveDraft}>{draftSaved ? <Check className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}{draftSaved ? "Draft saved" : "Save draft"}</button>} />
                <FinishCard icon={<Download className="size-4" aria-hidden="true" />} title="Download skill package" description={`Create ${slug || "agent-skill"}.zip with SKILL.md and scaffold folders.`} action={<button type="button" className="builder-secondary-button" onClick={() => void downloadZip()} disabled={isPackaging || issues.length > 0}><Download className="size-4" aria-hidden="true" />{isPackaging ? "Preparing..." : "Download ZIP"}</button>} />
                <FinishCard icon={<Rocket className="size-4" aria-hidden="true" />} title="Publish to Marketplace" description={`Publish a ${visibility} marketplace version with the selected targets and permissions.`} action={<button type="button" data-testid="builder-publish" className="builder-primary-button" onClick={() => void publishSkill()} disabled={isSaving || issues.length > 0}><Rocket className="size-4" aria-hidden="true" />{isSaving ? "Publishing..." : "Publish to Marketplace"}</button>} />
              </div>
              {issues.length ? <div className="builder-warning-banner">Resolve {issues.length} validation issue{issues.length === 1 ? "" : "s"} in the previous step before downloading or publishing.</div> : null}
              {downloadedPackage ? <div className="builder-success-banner"><CheckCircle2 className="size-4" aria-hidden="true" />Downloaded {downloadedPackage}</div> : null}
              {publishedSlug ? <div className="builder-success-banner"><PackageCheck className="size-4" aria-hidden="true" /><span>Published <strong>{publishedSlug}</strong>.</span>{savedUrls ? <a href={savedUrls.detail}>Open skill</a> : null}</div> : null}
              {packageError || saveError ? <div className="builder-error-banner">{packageError || saveError}</div> : null}
            </section>
          ) : null}

          {activeStep !== "source" ? (
            <footer className="builder-flow-actions">
              <button type="button" className="builder-secondary-button" onClick={() => goRelative(-1)} disabled={currentStepIndex <= 0}><ArrowLeft className="size-4" aria-hidden="true" />Back</button>
              <div className="builder-step-status">
                <span>{issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"}` : "Ready"}</span>
                <ChevronRight className="size-4" aria-hidden="true" />
                <span>{activeApiKey ? `${providerLabel} active` : `${providerLabel} key needed`}</span>
              </div>
              {currentStepIndex < orderedSteps.length - 1 ? <button type="button" className="builder-primary-button" onClick={() => goRelative(1)}>Continue<ArrowRight className="size-4" aria-hidden="true" /></button> : null}
            </footer>
          ) : null}
        </main>
      </div>

      <ApiSettingsModal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); setSettingsRevision((value) => value + 1); }} />
    </BuilderStudio>
  );
}

type GeneratedBuilderMetadata = {
  displayName?: string;
  directoryName?: string;
  category?: string;
  summary?: string;
  testPrompt?: string;
  permissions?: string[];
  targets?: string[];
};

type PackageResponse = {
  error?: string;
  skillMd?: string;
  files?: SkillPackageFile[];
  packageFiles?: SkillPackageFile[];
  packageUploadId?: string;
};

function PackageTree({ slug, files, skillMd }: { slug: string; files: SkillPackageFile[]; skillMd: string }) {
  const visibleFiles = files.length ? files : [
    { path: "SKILL.md", role: "skill_md", size: new TextEncoder().encode(skillMd).byteLength, mimeType: "text/markdown" },
    { path: "scripts/.gitkeep", role: "script", size: 0, mimeType: "text/plain" },
    { path: "references/REFERENCE.md", role: "reference", size: 0, mimeType: "text/markdown" },
    { path: "assets/.gitkeep", role: "asset", size: 0, mimeType: "text/plain" },
    { path: "examples/.gitkeep", role: "example", size: 0, mimeType: "text/plain" },
  ] satisfies SkillPackageFile[];
  return <div className="builder-package-tree"><div className="builder-package-root"><FolderOpen className="size-4" />{slug || "agent-skill"}/</div>{visibleFiles.map((file) => <div className="builder-package-file" key={file.path}><span className="font-mono">{file.path}</span><span>{file.role}</span><span>{file.size.toLocaleString()} B</span></div>)}</div>;
}

function ToggleList({ title, values, labels, selected, onToggle }: { title: string; values: readonly string[]; labels?: Record<string, string>; selected: string[]; onToggle: (value: string) => void }) {
  return <div><BuilderSectionLabel>{title}</BuilderSectionLabel><div className="mt-3 flex flex-wrap gap-2">{values.map((value) => { const active = selected.includes(value); return <button type="button" key={value} onClick={() => onToggle(value)} data-testid={`builder-toggle-${value.toLowerCase().replaceAll(" ", "-")}`} aria-pressed={active} className={`builder-chip ${active ? "builder-chip-active" : ""}`}>{active ? <CheckCircle2 className="size-3.5" /> : null}{labels?.[value] ?? value}</button>; })}</div></div>;
}

function FinishCard({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action: ReactNode }) {
  return (
    <article className="builder-finish-row">
      <span className="builder-finish-icon" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <div className="builder-finish-action">{action}</div>
    </article>
  );
}

function stepTitle(step: BuilderStep, path: BuilderPath) {
  if (step === "source") return "How do you want to start?";
  if (step === "instructions") return path === "import" ? "Review and repair the instructions" : "Describe and build the instructions";
  if (step === "package") return path === "import" ? "Review the imported package" : "Build the full package";
  if (step === "configuration") return "Configure the marketplace listing";
  if (step === "test") return "Validate and test the current draft";
  return "Download, save, or publish";
}

function stepDescription(step: BuilderStep, path: BuilderPath) {
  if (step === "source") return "Create a new skill with AI or import an existing package. The rest of the workflow adapts to your choice.";
  if (step === "instructions") return path === "import" ? "Confirm what the imported skill does, repair its structure, and refine SKILL.md." : "Use Copilot or edit SKILL.md directly. This file controls when and how the skill runs.";
  if (step === "package") return path === "import" ? "Inspect detected files and generate any missing required folders." : "Turn the instructions into a portable package with the required scaffold.";
  if (step === "configuration") return "Set the display metadata, permissions, install targets, and visibility.";
  if (step === "test") return "Resolve profile issues and run the exact unsaved draft before distribution.";
  return "Choose the result you need. Downloading does not publish, and saving a draft does not create a marketplace listing.";
}

function providerForModel(model: string) {
  if (model.startsWith("google/")) return "Google Gemini";
  if (model.startsWith("anthropic/")) return "Anthropic";
  if (model.startsWith("xai/")) return "xAI";
  if (model.startsWith("groq/")) return "Groq";
  return "OpenAI";
}

function hasKeyForModel(model: string, serialized: string) {
  try {
    const keys = JSON.parse(serialized) as Record<string, string>;
    const provider = model.split("/")[0];
    const keyName = provider === "google" ? "google" : provider;
    return Boolean(keys[keyName]?.trim());
  } catch {
    return false;
  }
}

function sandboxProviderForModel(model: string): "openai" | "gemini" | "groq" {
  if (model.startsWith("google/")) return "gemini";
  if (model.startsWith("groq/")) return "groq";
  return "openai";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
