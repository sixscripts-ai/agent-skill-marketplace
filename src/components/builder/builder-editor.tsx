"use client";

import type { ReactNode } from "react";
import type { BuilderViewMode } from "./builder-types";
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
    <section className="builder-editor-band" aria-label="Skill instructions editor">
      <header className="builder-editor-toolbar">
        <div className="min-w-0">
          <h3>{viewMode === "markdown" ? "SKILL.md" : "Visual canvas"}</h3>
          <p>Source of truth for when and how the agent uses this skill.</p>
        </div>
        <div className="builder-editor-toolbar-actions">
          <div className="builder-segmented" role="group" aria-label="Editor view">
            <button type="button" aria-pressed={viewMode === "markdown"} onClick={() => onViewModeChange("markdown")}>Markdown</button>
            <button type="button" aria-pressed={viewMode === "canvas"} onClick={() => onViewModeChange("canvas")}>Canvas</button>
          </div>
          <Badge tone={issueCount ? "amber" : "green"}>{issueCount ? "Needs review" : "Valid"}</Badge>
        </div>
      </header>
      <div className="builder-editor-pane">{editor}</div>
      <details className="builder-editor-preview">
        <summary>Rendered preview</summary>
        <div className="builder-editor-preview-body">{preview}</div>
      </details>
    </section>
  );
}
