"use client";

import type { ReactNode } from "react";
import type { BuilderViewMode } from "./builder-types";
import { BuilderPanel } from "./builder-ui";
import { Badge } from "../ui";

export function BuilderEditor({
  viewMode,
  issueCount,
  editor,
  preview,
  onViewModeChange,
}: {
  viewMode: BuilderViewMode;
  issueCount: number;
  editor: ReactNode;
  preview: ReactNode;
  onViewModeChange: (value: BuilderViewMode) => void;
}) {
  return (
    <BuilderPanel
      title={viewMode === "markdown" ? "SKILL.md instructions" : "Visual canvas"}
      description="The instruction file is the source of truth for when and how the agent uses this skill."
      action={
        <div className="flex items-center gap-2">
          <div className="builder-segmented">
            <button type="button" aria-pressed={viewMode === "markdown"} onClick={() => onViewModeChange("markdown")}>Markdown</button>
            <button type="button" aria-pressed={viewMode === "canvas"} onClick={() => onViewModeChange("canvas")}>Canvas</button>
          </div>
          <Badge tone={issueCount ? "amber" : "green"}>{issueCount ? "Needs review" : "Valid"}</Badge>
        </div>
      }
      className="min-w-0"
    >
      <div className="min-h-[640px] overflow-hidden rounded-lg border border-border bg-background">{editor}</div>
      <details className="mt-4 rounded-lg border border-border bg-muted p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">Rendered preview</summary>
        <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-border bg-background p-4">{preview}</div>
      </details>
    </BuilderPanel>
  );
}
