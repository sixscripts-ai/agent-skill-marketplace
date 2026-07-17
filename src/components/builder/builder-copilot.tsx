"use client";

import type { FormEvent } from "react";
import { AlertCircle, Bot, KeyRound, Send, Sparkles, Square } from "lucide-react";

export type BuilderCopilotMessage = {
  id: string;
  role: string;
  parts: Array<{
    type: string;
    text?: string;
    toolCallId?: string;
    state?: string;
  }>;
};

const starterPrompts = [
  {
    label: "Create from an idea",
    prompt: "Create a complete production-ready skill from my idea. Ask only for essential missing information, then update SKILL.md directly.",
  },
  {
    label: "Improve this skill",
    prompt: "Review the current SKILL.md, repair weak or missing sections, improve the workflow and examples, and update the editor directly.",
  },
  {
    label: "Add safety rules",
    prompt: "Add clear safety, accuracy, permission, and failure-handling rules to the current skill without changing its core purpose.",
  },
];

export function BuilderCopilot({
  messages,
  input,
  model,
  isGenerating,
  error,
  onInputChange,
  onModelChange,
  onSubmit,
  onStop,
  onOpenSettings,
}: {
  messages: BuilderCopilotMessage[];
  input: string;
  model: string;
  isGenerating: boolean;
  error: string;
  onInputChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <section className="builder-copilot-hero" aria-labelledby="builder-copilot-title">
      <div className="builder-copilot-heading">
        <div className="builder-copilot-icon"><Bot className="size-6" aria-hidden="true" /></div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Primary creation workspace</div>
          <h2 id="builder-copilot-title" className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">Build the skill with AI Copilot</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Describe the outcome you need. Copilot reads the current SKILL.md, asks for essential details, and updates the editor directly.</p>
        </div>
        <div className="builder-copilot-controls">
          <select aria-label="Copilot model" className="builder-compact-select" value={model} onChange={(event) => onModelChange(event.target.value)}>
            <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="xai/grok-2-latest">Grok 2</option>
            <option value="openai/gpt-4o">GPT-4o</option>
            <option value="anthropic/claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
          </select>
          <button type="button" className="builder-secondary-button" onClick={onOpenSettings}><KeyRound className="size-4" />API keys</button>
        </div>
      </div>

      <div className="builder-copilot-prompts" aria-label="Suggested prompts">
        {starterPrompts.map((item) => (
          <button key={item.label} type="button" className="builder-prompt-card" onClick={() => onInputChange(item.prompt)}>
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <span><strong>{item.label}</strong><small>{item.prompt}</small></span>
          </button>
        ))}
      </div>

      <div className="builder-copilot-thread" aria-live="polite">
        {messages.length === 0 ? (
          <div className="builder-copilot-empty"><Sparkles className="size-5 text-primary" /><span>Start with a plain-language idea such as “Build a social media growth skill for Shopify stores.”</span></div>
        ) : messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`builder-copilot-message ${message.role === "user" ? "builder-copilot-message-user" : "builder-copilot-message-agent"}`}>
              {message.parts.map((part, index) => part.type === "text" ? <div key={index}>{part.text}</div> : part.type.startsWith("tool-") ? <div key={part.toolCallId ?? index} className="flex items-center gap-2 text-xs"><Sparkles className="size-3" />Updating SKILL.md...</div> : null)}
            </div>
          </div>
        ))}
      </div>

      {error ? <div className="builder-copilot-error" role="alert"><AlertCircle className="size-4 shrink-0" /><span>{error}</span><button type="button" onClick={onOpenSettings}>Check API keys</button></div> : null}

      <form onSubmit={onSubmit} className="builder-copilot-composer">
        <textarea value={input} onChange={(event) => onInputChange(event.target.value)} className="builder-textarea min-h-24 flex-1" placeholder="Describe the skill you want to create or the change you want made..." disabled={isGenerating} />
        {isGenerating ? (
          <button type="button" onClick={onStop} className="builder-secondary-button self-end"><Square className="size-4" />Stop</button>
        ) : (
          <button type="submit" disabled={!input.trim()} className="builder-primary-button self-end"><Send className="size-4" />Generate and update</button>
        )}
      </form>
    </section>
  );
}
