"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { AlertCircle, Bot, CheckCircle2, KeyRound, Send, Sparkles, Square } from "lucide-react";
import { AI_MODEL_OPTIONS } from "@/lib/ai-model-catalog";

export type BuilderCopilotMessage = {
  id: string;
  role: string;
  parts: Array<{
    type: string;
    text?: string;
    toolCallId?: string;
    state?: string;
    output?: unknown;
    input?: unknown;
  }>;
};

const starterPrompts = [
  {
    label: "Discover then build",
    prompt: "I want a new skill. Start with discovery questions before writing SKILL.md.",
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
  onDiscoveryReady,
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
  onDiscoveryReady?: () => void;
}) {
  const latestQuestions = useMemo(() => extractLatestQuestions(messages), [messages]);

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSubmit(event as unknown as FormEvent<HTMLFormElement>);
  }

  function answerQuestion(question: string) {
    if (isGenerating) return;
    onInputChange(input.trim() ? `${input.trim()}\n\n${question}\n` : `${question}\n`);
  }

  return (
    <section className="builder-copilot-workbench" aria-labelledby="builder-copilot-title">
      <header className="builder-copilot-heading">
        <span className="builder-copilot-icon" aria-hidden="true"><Bot className="size-5" /></span>
        <div className="min-w-0">
          <div className="builder-eyebrow">AI Copilot</div>
          <h2 id="builder-copilot-title">Discover the job. Then write the skill.</h2>
          <p>Copilot asks a few questions first so the package is useful — then updates SKILL.md directly.</p>
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
              <p>Describe the outcome. Copilot will interview briefly, then draft the package.</p>
            </div>
          ) : messages.map((message) => (
            <CopilotMessage key={message.id} message={message} onAnswerQuestion={answerQuestion} disabled={isGenerating} />
          ))}
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
          {latestQuestions.length ? " Click a discovery chip to draft your answer." : ""}
        </p>
        {latestQuestions.length && !isGenerating ? (
          <div className="builder-copilot-discovery-actions">
            <button
              type="button"
              className="builder-secondary-button"
              onClick={() => {
                onDiscoveryReady?.();
                onInputChange(`${input.trim()}\n\nI answered the discovery questions. I have enough — build the skill now.`.trim());
              }}
            >
              I have enough — build
            </button>
            <button
              type="button"
              className="builder-secondary-button"
              onClick={() => {
                onDiscoveryReady?.();
                onInputChange(`${input.trim()}\n\nGenerate anyway with best-effort assumptions.`.trim());
              }}
            >
              Generate anyway
            </button>
          </div>
        ) : null}
        <div className="builder-composer-footer">
          <label className="builder-composer-model">
            <span>Model</span>
            <select
              aria-label="Copilot model"
              className="builder-compact-select"
              value={model}
              onChange={(event) => onModelChange(event.target.value)}
            >
              {AI_MODEL_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
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
              {latestQuestions.length ? "Send answers" : "Generate and update"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function CopilotMessage({
  message,
  onAnswerQuestion,
  disabled,
}: {
  message: BuilderCopilotMessage;
  onAnswerQuestion: (question: string) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const textParts = message.parts.filter((part) => part.type === "text" && part.text);
  const toolParts = message.parts.filter((part) => part.type.startsWith("tool-"));
  const combinedText = textParts.map((part) => part.text ?? "").join("\n");
  const isLongUserPrompt = message.role === "user" && (combinedText.length > 420 || combinedText.split("\n").length > 6);
  const clarify = extractClarifyFromParts(message.parts);

  return (
    <article className={`builder-copilot-message ${message.role === "user" ? "user" : "assistant"}`}>
      <div>
        {textParts.length ? (
          <div className={`builder-copilot-message-body ${isLongUserPrompt && !expanded ? "builder-copilot-message-collapsed" : ""}`}>
            {textParts.map((part, index) => <p key={index}>{part.text}</p>)}
          </div>
        ) : null}
        {clarify ? (
          <div className="builder-copilot-clarify">
            <p>{clarify.message}</p>
            <div className="builder-copilot-question-chips" aria-label="Discovery questions">
              {clarify.questions.map((question) => (
                <button key={question} type="button" className="builder-secondary-button" disabled={disabled} onClick={() => onAnswerQuestion(question)}>
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {isLongUserPrompt ? (
          <button type="button" className="builder-copilot-expand" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Collapse prompt" : "Show full prompt"}
          </button>
        ) : null}
        {toolParts.map((part, index) => {
          const complete = part.state === "output-available";
          const isClarify = part.type === "tool-clarify_skill_intent";
          const isUpdate = part.type === "tool-update_skill_markdown";
          if (isClarify && complete) return null;
          return (
            <div key={part.toolCallId ?? index} className="builder-copilot-tool-status">
              {complete ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
              {isUpdate
                ? complete
                  ? "SKILL.md and package synchronized."
                  : "Updating the skill package…"
                : complete
                  ? "Discovery questions ready."
                  : "Preparing discovery questions…"}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function extractClarifyFromParts(parts: BuilderCopilotMessage["parts"]) {
  for (const part of parts) {
    if (part.type !== "tool-clarify_skill_intent") continue;
    const output = (part.output ?? part.input) as { message?: string; questions?: string[] } | undefined;
    if (output?.message && Array.isArray(output.questions) && output.questions.length) {
      return { message: output.message, questions: output.questions };
    }
  }
  return null;
}

function extractLatestQuestions(messages: BuilderCopilotMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const clarify = extractClarifyFromParts(messages[index]?.parts ?? []);
    if (clarify?.questions.length) return clarify.questions;
  }
  return [] as string[];
}
