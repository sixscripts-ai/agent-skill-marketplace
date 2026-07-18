"use client";

import type { ChangeEvent, ReactNode } from "react";
import { CheckCircle2, FileArchive, FolderOpen } from "lucide-react";
import type { SkillPackageFile } from "@/lib/types";
import type { BuilderVisibility } from "./builder-types";
import { BuilderField, BuilderPanel, BuilderSectionLabel } from "./builder-ui";

export function BuilderConfiguration({
  name, slug, category, summary, visibility, permissions, targets,
  permissionValues, targetValues, permissionLabels, packageFiles,
  packageUploadId, uploadedFileName, uploadError,
  onNameChange, onSlugChange, onCategoryChange, onSummaryChange,
  onVisibilityChange, onPermissionToggle, onTargetToggle, onUpload,
  onPaste, onParse,
}: {
  name: string; slug: string; category: string; summary: string;
  visibility: BuilderVisibility; permissions: string[]; targets: string[];
  permissionValues: readonly string[]; targetValues: readonly string[];
  permissionLabels: Record<string, string>; packageFiles: SkillPackageFile[];
  packageUploadId: string; uploadedFileName: string; uploadError: string;
  onNameChange: (value: string) => void; onSlugChange: (value: string) => void;
  onCategoryChange: (value: string) => void; onSummaryChange: (value: string) => void;
  onVisibilityChange: (value: BuilderVisibility) => void;
  onPermissionToggle: (value: string) => void; onTargetToggle: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onPaste: () => void; onParse: () => void;
}) {
  const nameError = name.trim().length < 4 || name.trim().length > 64;
  const slugError = !/^[a-z0-9-]+$/.test(slug);
  const summaryError = summary.trim().length < 40 || summary.trim().length > 1024;

  return (
    <div className="space-y-4">
      <BuilderPanel title="Listing" description="How the skill appears in search, detail pages, and My Skills.">
        <div className="space-y-4">
          <BuilderField label="Name" helper={`${name.length}/64 characters`} error={nameError ? "Use 4 to 64 characters." : undefined}>
            <input className="builder-input" data-testid="builder-name" value={name} onChange={(e) => onNameChange(e.target.value)} />
          </BuilderField>
          <BuilderField label="Slug" helper="Lowercase letters, numbers, and hyphens." error={slugError ? "Enter a valid slug." : undefined}>
            <input className="builder-input font-mono" data-testid="builder-slug" value={slug} onChange={(e) => onSlugChange(e.target.value)} />
          </BuilderField>
          <BuilderField label="Category" helper="Use a short marketplace grouping.">
            <input className="builder-input" data-testid="builder-category" value={category} onChange={(e) => onCategoryChange(e.target.value)} />
          </BuilderField>
          <BuilderField label="Summary" helper={`${summary.length}/1024 characters`} error={summaryError ? "Use 40 to 1024 characters." : undefined}>
            <textarea className="builder-textarea min-h-24" data-testid="builder-summary" value={summary} onChange={(e) => onSummaryChange(e.target.value)} />
          </BuilderField>
          <BuilderField label="Visibility" helper="Public skills appear in the marketplace. Unlisted skills require a direct link.">
            <select className="builder-input" data-testid="builder-visibility" value={visibility} onChange={(e) => onVisibilityChange(e.target.value as BuilderVisibility)}>
              <option value="public">Public</option><option value="private">Private</option><option value="unlisted">Unlisted</option>
            </select>
          </BuilderField>
        </div>
      </BuilderPanel>

      <BuilderPanel title="Access" description="Declare what the skill can use and where it can be installed.">
        <div className="space-y-6">
          <ToggleList title="Permissions" values={permissionValues} labels={permissionLabels} selected={permissions} onToggle={onPermissionToggle} />
          <ToggleList title="Install targets" values={targetValues} selected={targets} onToggle={onTargetToggle} />
        </div>
      </BuilderPanel>

      <BuilderPanel title="Package" description="Import an existing SKILL.md, zip archive, or project folder.">
        <div className="grid gap-3 sm:grid-cols-2">
          <UploadTarget icon={<FileArchive className="size-5" />} title="File or zip" description="Markdown, .skill, or zip package.">
            <input accept=".md,.markdown,.skill,.zip,text/markdown,text/plain,application/zip" type="file" onChange={onUpload} data-testid="builder-file-upload" className="mt-3 block w-full text-xs" />
          </UploadTarget>
          <UploadTarget icon={<FolderOpen className="size-5" />} title="Folder" description="Preserves nested scripts, docs, and assets.">
            <input type="file" multiple onChange={onUpload} data-testid="builder-folder-upload" className="mt-3 block w-full text-xs" {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />
          </UploadTarget>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onPaste} className="builder-secondary-button justify-center">Paste SKILL.md</button>
          <button type="button" onClick={onParse} data-testid="builder-parse" className="builder-primary-button justify-center">Parse and repair</button>
        </div>
        {uploadError ? <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-800">{uploadError}</div> : null}
        {uploadedFileName ? <div className="mt-3 rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">Uploaded <span className="font-mono text-foreground">{uploadedFileName}</span>{packageUploadId ? <div className="mt-1 font-mono">Package {packageUploadId}</div> : null}</div> : null}
        {packageFiles.length ? <div className="mt-3 rounded-lg border border-border bg-background p-3"><BuilderSectionLabel>Package files</BuilderSectionLabel><div className="mt-3 max-h-48 overflow-auto rounded-md border border-border">{packageFiles.map((file) => <div key={file.path} className="grid grid-cols-[minmax(0,1fr)_72px_72px] gap-2 border-b border-border px-3 py-2 text-xs last:border-b-0"><span className="truncate font-mono text-foreground">{file.path}</span><span className="text-muted-foreground">{file.role}</span><span className="text-right text-muted-foreground">{file.size.toLocaleString()} B</span></div>)}</div></div> : null}
      </BuilderPanel>
    </div>
  );
}

function ToggleList({ title, values, labels, selected, onToggle }: { title: string; values: readonly string[]; labels?: Record<string, string>; selected: string[]; onToggle: (value: string) => void }) {
  return <div><BuilderSectionLabel>{title}</BuilderSectionLabel><div className="mt-3 flex flex-wrap gap-2">{values.map((value) => { const active = selected.includes(value); return <button type="button" key={value} onClick={() => onToggle(value)} data-testid={`builder-toggle-${value.toLowerCase().replaceAll(" ", "-")}`} aria-pressed={active} className={`builder-chip ${active ? "builder-chip-active" : ""}`}>{active ? <CheckCircle2 className="size-3.5" /> : null}{labels?.[value] ?? value}</button>; })}</div></div>;
}

function UploadTarget({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <label className="block rounded-lg border border-dashed border-border bg-muted p-4 transition hover:border-primary/60 hover:bg-primary/5"><span className="flex items-center gap-2 font-semibold text-foreground">{icon}{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>{children}</label>;
}
