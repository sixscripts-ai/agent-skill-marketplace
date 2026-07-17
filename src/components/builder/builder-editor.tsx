"use client";

import type { FormEvent, ReactNode } from "react";
import { Send, Sparkles } from "lucide-react";
import type { BuilderViewMode } from "./builder-types";
import { BuilderPanel } from "./builder-ui";
import { Badge } from "../ui";

export type BuilderChatMessage = {
  id: string;
  role: string;
  parts: Array<{ type: string; text?: string; toolCallId?: string }>;
};

export function BuilderEditor({
  viewMode, issueCount, copilotModel, messages, input, isGenerating,
  editor, preview, onViewModeChange, onModelChange, onInputChange, onSubmit,
}: {
  viewMode: BuilderViewMode;
  issueCount: number;
  copilotModel: string;
  messages: BuilderChatMessage[];
  input: string;
  isGenerating: boolean;
  editor: ReactNode;
  preview: ReactNode;
  onViewModeChange: (value: BuilderViewMode) => void;
  onModelChange: (value: string) => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <BuilderPanel
        title={viewMode === "markdown" ? "SKILL.md instructions" : "Visual canvas"}
        description="The instruction file is the source of truth for when and how the agent uses this skill."
        action={<div className="flex items-center gap-2"><div className="builder-segmented"><button type="button" aria-pressed={viewMode === "markdown"} onClick={() => onViewModeChange("markdown")}>Markdown</button><button type="button" aria-pressed={viewMode === "canvas"} onClick={() => onViewModeChange("canvas")}>Canvas</button></div><Badge tone={issueCount ? "amber" : "green"}>{issueCount ? "Needs review" : "Valid"}</Badge></div>}
        className="min-w-0"
      >
        <div className="min-h-[640px] overflow-hidden rounded-lg border border-border bg-background">{editor}</div>
        <details className="mt-4 rounded-lg border border-border bg-muted p-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Rendered preview</summary>
          <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-border bg-background p-4">{preview}</div>
        </details>
      </BuilderPanel>

      <BuilderPanel
        title="AI copilot"
        description="Describe a focused change. Copilot can update the instruction file without replacing the rest of the package."
        action={<select className="builder-compact-select" value={copilotModel} onChange={(event) => onModelChange(event.target.value)}><option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option><option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option><option value="xai/grok-2-latest">Grok 2</option><option value="openai/gpt-4o">GPT-4o</option><option value="anthropic/claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option></select>}
      >
        <div className="max-h-80 min-h-36 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted p-4">
          {messages.length === 0 ? <div className="flex gap-3 text-sm leading-6 text-muted-foreground"><Sparkles className="mt-1 size-4 shrink-0 text-primary" />Ask for a specific workflow, permission, example, or compatibility change.</div> : messages.map((message) => <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground"}`}>{message.parts.map((part, index) => part.type === "text" ? <div key={index}>{part.text}</div> : part.type.startsWith("tool-") ? <div key={part.toolCallId ?? index} className="text-xs text-muted-foreground">Updating skill instructions...</div> : null)}</div></div>)}
        </div>
        <form onSubmit={onSubmit} className="mt-3 flex gap-2">
          <input value={input} onChange={(event) => onInputChange(event.target.value)} placeholder="Add a validation step for API credentials..." className="builder-input flex-1" disabled={isGenerating} />
          <button type="submit" disabled={!input.trim() || isGenerating} className="builder-primary-button px-3" aria-label="Send to copilot"><Send className="size-4" /></button>
        </form>
      </BuilderPanel>
    </div>
  );
}
