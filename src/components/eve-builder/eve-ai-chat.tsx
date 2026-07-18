"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Activity, Bot, Check, KeyRound, LoaderCircle, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { AGENT_MODEL_OPTIONS, runAgentTest, synchronizeAgentProject, type AgentProject } from "@/lib/eve/agent-project";
import { ApiSettingsModal, type ApiKeys } from "../api-settings-modal";
import { eveApi, useEveWorkspace, type EveStoredProject } from "./eve-workspace-context";

type Message = { id: string; role: "user" | "assistant"; content: string; plan?: string[]; files?: string[]; error?: boolean; requestId?: string; skills?: string[] };
type ArchitectResponse = {
  result: { status: "clarify"; message: string; questions: string[]; plan: string[] } | { status: "update"; update: Partial<AgentProject>; plan: string[]; complete: boolean; continuationPrompt?: string };
  project: AgentProject;
  requestId: string;
};

const welcome: Message = { id: "welcome", role: "assistant", content: "Describe the agent you need. I will create the brief, models, tools, permissions, tests, and runnable project files. Work is checkpointed to your account after every successful batch." };
const BYOK_STORAGE_KEY = "ai_api_keys_byok";
const KEYS_STORAGE_KEY = "ai_api_keys";

export function EveAiChat() {
  const {
    projectId,
    project,
    status,
    runs,
    setLocalProject,
    setBuilding,
    ensureProject,
    applyServerProject,
    refresh,
  } = useEveWorkspace();
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checkpoint, setCheckpoint] = useState<AgentProject | null>(null);
  const [persistWarning, setPersistWarning] = useState("");

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      try {
        const stored = await eveApi<EveStoredProject>(`/api/eve/projects?id=${encodeURIComponent(projectId)}`);
        const restored = stored.conversation?.messages?.map((message) => ({
          id: message.id,
          role: message.role === "user" ? "user" as const : "assistant" as const,
          content: message.content,
          plan: Array.isArray(message.metadata?.plan) ? message.metadata.plan.filter((item): item is string => typeof item === "string") : undefined,
          files: Array.isArray(message.metadata?.files) ? message.metadata.files.filter((item): item is string => typeof item === "string") : undefined,
          skills: Array.isArray(message.metadata?.skills) ? message.metadata.skills.filter((item): item is string => typeof item === "string") : undefined,
          error: message.metadata?.error === true,
          requestId: typeof message.metadata?.requestId === "string" ? message.metadata.requestId : undefined,
        })) ?? [];
        if (restored.length) setMessages([welcome, ...restored]);
      } catch {
        /* keep local messages if conversation hydrate fails */
      }
    })();
  }, [projectId]);

  async function refreshFromServer(id: string) {
    const stored = await eveApi<EveStoredProject>(`/api/eve/projects?id=${encodeURIComponent(id)}`);
    applyServerProject(stored, { forceFiles: true });
    await refresh();
  }

  function byokPayload() {
    const keys = JSON.parse(localStorage.getItem(KEYS_STORAGE_KEY) || "{}") as ApiKeys;
    const byok = JSON.parse(localStorage.getItem(BYOK_STORAGE_KEY) || "{}") as Record<string, boolean>;
    const apiKeys: Record<string, string> = {};
    const enabled: Record<string, boolean> = {};
    for (const [provider, on] of Object.entries(byok)) {
      if (!on) continue;
      const value = keys[provider as keyof ApiKeys]?.trim();
      if (!value) continue;
      apiKeys[provider] = value;
      enabled[provider] = true;
    }
    return { apiKeys, byok: enabled };
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const request = input.trim();
    if (!request || busy) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: request };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setBusy(true);
    setBuilding(true);
    setCheckpoint(project);
    setPersistWarning("");
    let working = synchronizeAgentProject(project);
    let continuation: string | undefined;
    let runId = "";
    let id = projectId;
    let batches = 0;
    const plans: string[] = [];
    const files: string[] = [];
    try {
      id = await ensureProject(working);
      await eveApi("/api/eve/messages", { method: "POST", body: JSON.stringify({ projectId: id, role: "user", content: request }) });
      const run = await eveApi<{ id: string }>("/api/eve/runs", { method: "POST", body: JSON.stringify({ projectId: id, prompt: request, model: working.architectModel }) });
      runId = run.id;
      const { apiKeys, byok } = byokPayload();
      do {
        batches += 1;
        setProgress(continuation ? `Continuing build · batch ${batches}` : "Interpreting request and generating the project");
        const response = await eveApi<ArchitectResponse>("/api/eve/architect", {
          method: "POST",
          body: JSON.stringify({
            projectId: id,
            runId,
            prompt: request,
            modelId: working.architectModel,
            apiKeys,
            byok,
            history: history.map(({ role, content }) => ({ role, content })),
            continuation,
          }),
        });
        const result = response.result;
        working = synchronizeAgentProject(response.project);
        setLocalProject(working);
        await refreshFromServer(id);
        if (result.status === "clarify") {
          const text = [result.message, ...result.questions].filter(Boolean).join("\n\n");
          await eveApi("/api/eve/messages", { method: "POST", body: JSON.stringify({ projectId: id, role: "assistant", content: text, metadata: { plan: result.plan, requestId: response.requestId } }) });
          await eveApi("/api/eve/runs", { method: "PATCH", body: JSON.stringify({ runId, status: "completed", currentBatch: batches, event: { type: "clarification", status: "waiting", title: "Clarification requested", detail: text, metadata: { requestId: response.requestId, plan: result.plan } } }) });
          setMessages([...history, { id: crypto.randomUUID(), role: "assistant", content: text, plan: result.plan, requestId: response.requestId }]);
          await refreshFromServer(id);
          return;
        }
        plans.push(...result.plan);
        if (Array.isArray(result.update.files)) files.push(...result.update.files.map((file) => file.path).filter(Boolean));
        continuation = result.complete ? undefined : result.continuationPrompt;
      } while (continuation && batches < 5);

      working = working.tests.reduce((state, test) => runAgentTest(state, test.id), working);
      const finalProject = synchronizeAgentProject({ ...working, changes: [{ id: crypto.randomUUID(), label: request, createdAt: new Date().toISOString(), files: [...new Set(files)] }, ...working.changes] });
      const text = continuation ? "I saved five build batches. Send ‘continue building’ to add the remaining modules." : "The project is built, tested, and saved to your Eve workspace.";
      const metadata = { plan: [...new Set(plans)], files: [...new Set(files)], skills: finalProject.skills.map((skill) => skill.slug || skill.name).filter(Boolean) };
      await eveApi("/api/eve/projects", { method: "PATCH", body: JSON.stringify({ projectId: id, project: finalProject, fromBuild: true }) });
      await eveApi("/api/eve/messages", { method: "POST", body: JSON.stringify({ projectId: id, role: "assistant", content: text, metadata }) });
      await eveApi("/api/eve/runs", { method: "PATCH", body: JSON.stringify({ runId, status: "completed", currentBatch: batches, event: { type: "complete", status: "completed", title: "Project saved", detail: text, metadata } }) });
      setLocalProject(finalProject);
      setMessages([...history, { id: crypto.randomUUID(), role: "assistant", content: text, plan: metadata.plan, files: metadata.files, skills: metadata.skills }]);
      await refreshFromServer(id);
    } catch (error) {
      const err = error as Error & { requestId?: string };
      const text = err instanceof Error ? err.message : String(error);
      const requestId = err.requestId || text.match(/Reference:\s*([0-9a-f-]{36})/i)?.[1];
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: text, error: true, requestId }]);
      if (id) {
        try {
          await eveApi("/api/eve/messages", { method: "POST", body: JSON.stringify({ projectId: id, role: "assistant", content: text, metadata: { error: true, requestId } }) });
          if (runId) {
            await eveApi("/api/eve/runs", {
              method: "PATCH",
              body: JSON.stringify({
                runId,
                status: "failed",
                error: text,
                event: { type: "error", status: "failed", title: "Client build failed", detail: text, metadata: { requestId } },
              }),
            });
          }
          await refreshFromServer(id);
        } catch (persistError) {
          setPersistWarning(persistError instanceof Error ? persistError.message : "Failed to persist the error to Neon.");
        }
      }
    } finally {
      setBusy(false);
      setBuilding(false);
      setProgress("");
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    void submit();
  }

  const latestRun = runs[0];
  const statusLabel = titleCase(status);

  return (
    <section className="eve-ai-workspace">
      <header className="eve-chat-heading">
        <span aria-hidden="true"><Sparkles className="size-5" /></span>
        <div>
          <div className="eve-eyebrow">AI-first builder</div>
          <h2>Describe the agent. Eve does the work.</h2>
          <p>
            {projectId
              ? <>Connected to persistent Eve workspace · <span className={`eve-status-chip eve-status-${status}`}>{statusLabel}</span></>
              : "Sign in to save projects, messages, files, and build history to Neon."}
          </p>
        </div>
        <div className="eve-chat-heading-actions">
          <button type="button" className="builder-secondary-button" onClick={() => setSettingsOpen(true)}>
            <KeyRound className="size-4" aria-hidden="true" />
            API keys
          </button>
          {checkpoint ? (
            <button type="button" className="builder-secondary-button" onClick={() => setLocalProject(checkpoint)}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Undo
            </button>
          ) : null}
        </div>
      </header>

      {persistWarning ? <div className="eve-workspace-error" role="alert">{persistWarning}</div> : null}

      <div className="eve-chat-scroll" aria-live="polite">
        <div className="eve-chat-thread">
          {messages.map((message) => (
            <article key={message.id} className={`eve-chat-message ${message.role} ${message.error ? "error" : ""}`}>
              <span className="eve-chat-avatar" aria-hidden="true">{message.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}</span>
              <div>
                <p>{message.content}</p>
                {message.plan?.length ? <div className="eve-chat-plan"><strong>Work completed</strong>{message.plan.map((item) => <span key={item}><Check className="size-3.5" aria-hidden="true" />{item}</span>)}</div> : null}
                {message.files?.length ? <small>{message.files.length} project files created or changed</small> : null}
                {message.skills?.length ? <small>Skills: {message.skills.join(", ")}</small> : null}
                {message.requestId ? <small>Reference: {message.requestId}</small> : null}
              </div>
            </article>
          ))}
          {busy || progress ? (
            <article className="eve-chat-message assistant">
              <span className="eve-chat-avatar" aria-hidden="true"><Bot className="size-4" /></span>
              <div><p className="eve-chat-working"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{progress || "Working"}</p></div>
            </article>
          ) : null}
        </div>

        <aside className="eve-build-activity eve-build-activity-inline" aria-label="Build activity">
          <div className="eve-build-activity-heading">
            <Activity className="size-4" aria-hidden="true" />
            <strong>Build activity</strong>
          </div>
          {!latestRun ? (
            <p className="eve-build-empty">
              No build activity yet. Describe what you want Eve to build below, then press Build with Eve.
            </p>
          ) : (
            <div className="eve-build-run">
              <div className="eve-build-run-meta">
                <span className={`eve-build-status ${latestRun.status}`}>{latestRun.status}</span>
                <small>{latestRun.model}</small>
              </div>
              <p className="eve-build-prompt">{latestRun.prompt}</p>
              {latestRun.error ? <p className="eve-build-error" role="alert">{latestRun.error}</p> : null}
              <ol className="eve-build-events">
                {latestRun.events.map((event) => {
                  const meta = event.metadata ?? {};
                  const plan = Array.isArray(meta.plan) ? meta.plan.filter((item): item is string => typeof item === "string") : [];
                  const eventFiles = Array.isArray(meta.files) ? meta.files.filter((item): item is string => typeof item === "string") : [];
                  const skills = Array.isArray(meta.skills) ? meta.skills.filter((item): item is string => typeof item === "string") : [];
                  const requestId = typeof meta.requestId === "string" ? meta.requestId : null;
                  return (
                    <li key={event.id} className={`eve-build-event ${event.status}`}>
                      <div><strong>{event.title}</strong><span>{event.type}</span></div>
                      {event.detail ? <p>{event.detail}</p> : null}
                      {plan.length ? <ul>{plan.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul> : null}
                      {eventFiles.length ? <small>Files: {eventFiles.slice(0, 8).join(", ")}</small> : null}
                      {skills.length ? <small>Skills: {skills.slice(0, 8).join(", ")}</small> : null}
                      {requestId ? <small>Reference: {requestId}</small> : null}
                    </li>
                  );
                })}
              </ol>
              {runs.length > 1 ? <small className="eve-build-history-note">{runs.length} recent runs stored in Neon</small> : null}
            </div>
          )}
        </aside>
      </div>

      <form className="eve-chat-composer" onSubmit={(event) => void submit(event)}>
        <label className="eve-composer-label" htmlFor="eve-composer-input">
          Describe what you want Eve to build
        </label>
        <textarea
          id="eve-composer-input"
          className="builder-textarea eve-composer-textarea"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onComposerKeyDown}
          placeholder="Build a customer support agent that searches our docs, drafts replies, asks before sending, and deploys to Vercel."
          rows={5}
          aria-describedby="eve-composer-hint"
        />
        <p id="eve-composer-hint" className="eve-composer-hint">
          Press Cmd or Ctrl + Enter to build. Enter adds a new line.
        </p>
        <div className="eve-composer-footer">
          <label className="eve-composer-model">
            <span>Model</span>
            <select
              className="builder-compact-select"
              value={project.architectModel}
              onChange={(event) => setLocalProject({ ...project, architectModel: event.target.value })}
              aria-label="Architect model"
            >
              {AGENT_MODEL_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button
            className="builder-primary-button"
            type="submit"
            disabled={!input.trim() || busy}
            aria-busy={busy}
          >
            <Send className="size-4" aria-hidden="true" />
            {busy ? "Building…" : "Build with Eve"}
          </button>
        </div>
      </form>

      <ApiSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </section>
  );
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Draft";
}
