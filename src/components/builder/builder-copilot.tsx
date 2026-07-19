"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { AlertCircle, Bot, CheckCircle2, KeyRound, Send, Sparkles, Square } from "lucide-react";

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
  showControls = true,
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
  showControls?: boolean;
  onInputChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  onOpenSettings: () => void;
}) {
  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSubmit(event as unknown as FormEvent<HTMLFormElement>);
  }

  return (
    <section className="builder-copilot-workbench" aria-labelledby="builder-copilot-title">
      <header className="builder-copilot-heading">
        <span className="builder-copilot-icon" aria-hidden="true"><Bot className="size-5" /></span>
        <div className="min-w-0">
          <div className="builder-eyebrow">AI Copilot</div>
          <h2 id="builder-copilot-title">Describe the skill. Copilot updates the draft.</h2>
          <p>Copilot reads the current SKILL.md and package files, then writes changes directly.</p>
        </div>
        {showControls ? (
          <div className="builder-copilot-controls">
            <button type="button" className="builder-secondary-button" onClick={onOpenSettings}>
              <KeyRound className="size-4" aria-hidden="true" />
              API keys
            </button>
          </div>
        ) : null}
      </header>

      <div className="builder-copilot-scroll" aria-live="polite">
        <div className="builder-copilot-prompts" aria-label="Suggested prompts">
          {starterPrompts.map((item) => (
            <button key={item.label} type="button" className="builder-prompt-chip" onClick={() => onInputChange(item.prompt)}>
              <Sparkles className="size-3.5" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="builder-copilot-thread">
          {messages.length === 0 ? (
            <div className="builder-copilot-empty">
              <p>No messages yet.</p>
              <p>Describe what you want Eve-style: “Build a social media growth skill for Shopify stores.”</p>
            </div>
          ) : messages.map((message) => <CopilotMessage key={message.id} message={message} />)}
        </div>
      </div>

      {error ? (
        <div className="builder-copilot-error" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={onOpenSettings}>Check API keys</button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="builder-copilot-composer">
        <label className="builder-composer-label" htmlFor="builder-copilot-input">
          Describe what you want Copilot to build
        </label>
        <textarea
          id="builder-copilot-input"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onComposerKeyDown}
          className="builder-textarea builder-composer-textarea"
          placeholder="Build a customer support skill that searches docs, drafts replies, and asks before sending."
          rows={5}
          aria-describedby="builder-copilot-hint"
        />
        <p id="builder-copilot-hint" className="builder-composer-hint">
          Press Cmd or Ctrl + Enter to generate. Enter adds a new line.
        </p>
        <div className="builder-composer-footer">
          <label className="builder-composer-model">
            <span>Model</span>
            <select
              aria-label="Copilot model"
              className="builder-compact-select"
              value={model}
              onChange={(event) => onModelChange(event.target.value)}
            >
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="xai/grok-4.3">Grok 4.3</option>
              <option value="xai/grok-4.5">Grok 4.5</option>
              <option value="groq/llama-3.3-70b-versatile">Llama 3.3 (Groq)</option>
              <option value="groq/mixtral-8x7b-32768">Mixtral (Groq)</option>
              <option value="deepseek/deepseek-v4-flash">DeepSeek V4 Flash</option>
              <option value="deepseek/deepseek-v4-pro">DeepSeek V4 Pro</option>
              <option value="openai/gpt-4o">GPT-4o</option>
              <option value="anthropic/claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
            </select>
          </label>
          {isGenerating ? (
            <button type="button" onClick={onStop} className="builder-secondary-button">
              <Square className="size-4" aria-hidden="true" />
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="builder-primary-button">
              <Send className="size-4" aria-hidden="true" />
              Generate and update
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function CopilotMessage({ message }: { message: BuilderCopilotMessage }) {
  const [expanded, setExpanded] = useState(false);
  const textParts = message.parts.filter((part) => part.type === "text" && part.text);
  const toolParts = message.parts.filter((part) => part.type.startsWith("tool-"));
  const combinedText = textParts.map((part) => part.text ?? "").join("\n");
  const isLongUserPrompt = message.role === "user" && (combinedText.length > 420 || combinedText.split("\n").length > 6);

  return (
    <article className={`builder-copilot-message ${message.role === "user" ? "user" : "assistant"}`}>
      <div>
        {textParts.length ? (
          <div className={`builder-copilot-message-body ${isLongUserPrompt && !expanded ? "builder-copilot-message-collapsed" : ""}`}>
            {textParts.map((part, index) => <p key={index}>{part.text}</p>)}
          </div>
        ) : null}
        {isLongUserPrompt ? (
          <button type="button" className="builder-copilot-expand" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Collapse prompt" : "Show full prompt"}
          </button>
        ) : null}
        {toolParts.map((part, index) => {
          const complete = part.state === "output-available";
          return (
            <div key={part.toolCallId ?? index} className="builder-copilot-tool-status">
              {complete ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
              {complete ? "SKILL.md and package synchronized." : "Updating the skill package…"}
            </div>
          );
        })}
      </div>
    </article>
  );
}
