"use client";

import type { ReactNode } from "react";
import { PackageCheck, Play } from "lucide-react";
import type { ParsedSkillImport, SkillRun } from "@/lib/types";
import type { BuilderSavedUrls, BuilderVisibility } from "./builder-types";
import { BuilderPanel, BuilderSectionLabel, BuilderStatus } from "./builder-ui";
import { Badge } from "../ui";
import { CodeBlock } from "../code-block";

export function BuilderInspector({
  issues, importResult, publishedSlug, savedUrls, saveError, visibility,
  name, category, summary, permissions, targets, testInput, testRun, isTesting,
  onApplySuggestions, onTestInputChange, onRunTest,
}: {
  issues: string[]; importResult: ParsedSkillImport | null; publishedSlug: string;
  savedUrls: BuilderSavedUrls | null; saveError: string; visibility: BuilderVisibility;
  name: string; category: string; summary: string; permissions: string[]; targets: string[];
  testInput: string; testRun: SkillRun | null; isTesting: boolean;
  onApplySuggestions: () => void; onTestInputChange: (value: string) => void; onRunTest: () => void;
}) {
  return <div className="space-y-4">
    <BuilderPanel title="Validation" description="Resolve every blocking issue before publishing.">
      <div className="space-y-2">{issues.length ? issues.map((issue) => <BuilderStatus key={issue} valid={false}>{issue}</BuilderStatus>) : <BuilderStatus valid>Required metadata, workflow, permissions, examples, and targets are present.</BuilderStatus>}</div>
      {importResult ? <div className="mt-4 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground"><div className="font-medium text-foreground">Import analysis</div><p className="mt-1">{importResult.permissions.length} permissions, {importResult.compatibilityTargets.length} targets, and {importResult.issues.length} warnings detected.</p>{importResult.suggestions.length ? <><ul className="mt-3 list-disc space-y-1 pl-5">{importResult.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul><button type="button" onClick={onApplySuggestions} data-testid="builder-apply-suggestions" className="builder-secondary-button mt-3">Apply suggested formatting</button></> : null}</div> : null}
      {publishedSlug ? <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground"><div className="flex items-center gap-2 font-semibold"><PackageCheck className="size-4 text-primary" />Version published</div><div className="mt-2 font-mono text-xs">/skills/{publishedSlug}</div>{savedUrls ? <div className="mt-3 flex flex-wrap gap-2"><ResultLink href={`${savedUrls.run}?mode=autopilot`}>Quick run</ResultLink><ResultLink href={savedUrls.detail}>Detail</ResultLink><ResultLink href={savedUrls.mySkills}>My Skills</ResultLink><ResultLink href={savedUrls.run}>Run</ResultLink><ResultLink href={savedUrls.edit}>Edit</ResultLink>{visibility === "public" ? <ResultLink href={savedUrls.marketplace}>Marketplace</ResultLink> : null}</div> : null}</div> : null}
      {saveError ? <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{saveError}</div> : null}
    </BuilderPanel>

    <BuilderPanel title="Marketplace preview" description="A compact preview of the listing users will discover.">
      <div className="rounded-lg border border-border bg-background p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-foreground">{name}</h3><p className="mt-1 text-sm text-muted-foreground">{category}</p></div><Badge tone="amber">Experimental</Badge></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{summary}</p><div className="mt-4 flex flex-wrap gap-2">{targets.slice(0, 3).map((target) => <span key={target} className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">{target}</span>)}</div></div>
    </BuilderPanel>

    <BuilderPanel title="Test run" description="Run one prompt before publishing and inspect the streamed result.">
      <div className="flex gap-2"><input value={testInput} onChange={(e) => onTestInputChange(e.target.value)} data-testid="builder-test-input" className="builder-input flex-1" onKeyDown={(e) => { if (e.key === "Enter" && !isTesting) onRunTest(); }} /><button type="button" onClick={onRunTest} disabled={isTesting || !testInput.trim()} className="builder-primary-button px-3"><Play className="size-4" />{isTesting ? "Running" : "Run"}</button></div>
      <div className="mt-3 rounded-lg border border-border bg-muted p-4"><div className="flex items-center justify-between gap-3"><BuilderSectionLabel>Output</BuilderSectionLabel>{testRun?.status ? <Badge tone={testRun.status === "failed" ? "red" : testRun.status === "complete" ? "green" : "amber"}>{testRun.status}</Badge> : null}</div><p className="mt-2 min-h-12 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{testRun?.output || (isTesting ? "Streaming..." : "Run a prompt to preview the skill output.")}</p></div>
    </BuilderPanel>

    <BuilderPanel title="README excerpt" description="Generated from the current metadata and access selections."><CodeBlock code={`# ${name}\n\n${summary}\n\n## Compatibility\n${targets.map((target) => `- ${target}`).join("\n")}\n\n## Permissions\n${permissions.map((permission) => `- ${permission}`).join("\n")}\n\nVisibility: ${visibility}`} /></BuilderPanel>
  </div>;
}

function ResultLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="inline-flex min-h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:border-primary/50 hover:text-primary" href={href}>{children}</a>;
}
