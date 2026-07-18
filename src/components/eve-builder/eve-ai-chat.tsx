"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bot, Check, KeyRound, LoaderCircle, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { AGENT_MODEL_OPTIONS, createDefaultAgentProject, runAgentTest, synchronizeAgentProject, type AgentProject } from "@/lib/eve/agent-project";
import { ApiSettingsModal } from "../api-settings-modal";

type Message = { id: string; role: "user" | "assistant"; content: string; plan?: string[]; files?: string[]; error?: boolean };
type StoredProject = { id: string; project: AgentProject; conversation?: { messages?: Array<{ id: string; role: string; content: string; metadata?: { plan?: string[]; files?: string[] } }> } };
type ArchitectResponse = { result: { status: "clarify"; message: string; questions: string[]; plan: string[] } | { status: "update"; update: Partial<AgentProject>; plan: string[]; complete: boolean; continuationPrompt?: string }; project: AgentProject; requestId: string };
const welcome: Message = { id: "welcome", role: "assistant", content: "Describe the agent you need. I will create the brief, models, tools, permissions, tests, and runnable project files. Work is checkpointed to your account after every successful batch." };

export function EveAiChat() {
  const [project, setProject] = useState<AgentProject>(() => createDefaultAgentProject());
  const [projectId, setProjectId] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("Loading your Eve workspace");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checkpoint, setCheckpoint] = useState<AgentProject | null>(null);

  useEffect(() => { void loadWorkspace(); }, []);

  async function loadWorkspace() {
    try {
      const list = await api<Array<{ id: string }>>("/api/eve/projects");
      if (!list[0]) return;
      const stored = await api<StoredProject>(`/api/eve/projects?id=${encodeURIComponent(list[0].id)}`);
      setProjectId(stored.id);
      setProject(synchronizeAgentProject(stored.project));
      const restored = stored.conversation?.messages?.map((message) => ({ id: message.id, role: message.role === "user" ? "user" as const : "assistant" as const, content: message.content, plan: message.metadata?.plan, files: message.metadata?.files })) ?? [];
      if (restored.length) setMessages([welcome, ...restored]);
    } catch { /* signed-out users see the default workspace */ }
    finally { setProgress(""); }
  }

  async function ensureProject(current: AgentProject) {
    if (projectId) return projectId;
    const stored = await api<StoredProject>("/api/eve/projects", { method: "POST", body: JSON.stringify({ project: current }) });
    setProjectId(stored.id);
    return stored.id;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const request = input.trim();
    if (!request || busy) return;
    const user: Message = { id: crypto.randomUUID(), role: "user", content: request };
    const history = [...messages, user];
    setMessages(history); setInput(""); setBusy(true); setCheckpoint(project);
    let working = project;
    let continuation: string | undefined;
    let runId = "";
    let batches = 0;
    const plans: string[] = [];
    const files: string[] = [];
    try {
      const id = await ensureProject(working);
      await api("/api/eve/messages", { method: "POST", body: JSON.stringify({ projectId: id, role: "user", content: request }) });
      const run = await api<{ id: string }>("/api/eve/runs", { method: "POST", body: JSON.stringify({ projectId: id, prompt: request, model: working.architectModel }) });
      runId = run.id;
      const keys = JSON.parse(localStorage.getItem("ai_api_keys") || "{}") as Record<string, string>;
      do {
        batches += 1;
        setProgress(continuation ? `Continuing build · batch ${batches}` : "Interpreting request and generating the project");
        const response = await api<ArchitectResponse>("/api/eve/architect", { method: "POST", body: JSON.stringify({ projectId: id, runId, prompt: request, modelId: working.architectModel, apiKeys: keys, history: history.map(({ role, content }) => ({ role, content })), continuation }) });
        const result = response.result;
        working = synchronizeAgentProject(response.project);
        setProject(working);
        if (result.status === "clarify") {
          const text = [result.message, ...result.questions].filter(Boolean).join("\n\n");
          await api("/api/eve/messages", { method: "POST", body: JSON.stringify({ projectId: id, role: "assistant", content: text, metadata: { plan: result.plan } }) });
          await api("/api/eve/runs", { method: "PATCH", body: JSON.stringify({ runId, status: "completed", currentBatch: batches, event: { type: "clarification", status: "waiting", title: "Clarification requested", detail: text } }) });
          setMessages([...history, { id: crypto.randomUUID(), role: "assistant", content: text, plan: result.plan }]);
          return;
        }
        plans.push(...result.plan);
        if (Array.isArray(result.update.files)) files.push(...result.update.files.map((file) => file.path).filter(Boolean));
        continuation = result.complete ? undefined : result.continuationPrompt;
      } while (continuation && batches < 5);

      working = working.tests.reduce((state, test) => runAgentTest(state, test.id), working);
      const finalProject = synchronizeAgentProject({ ...working, changes: [{ id: crypto.randomUUID(), label: request, createdAt: new Date().toISOString(), files: [...new Set(files)] }, ...working.changes] });
      const text = continuation ? "I saved five build batches. Send ‘continue building’ to add the remaining modules." : "The project is built, tested, and saved to your Eve workspace.";
      const metadata = { plan: [...new Set(plans)], files: [...new Set(files)] };
      await api("/api/eve/projects", { method: "PATCH", body: JSON.stringify({ projectId: id, project: finalProject }) });
      await api("/api/eve/messages", { method: "POST", body: JSON.stringify({ projectId: id, role: "assistant", content: text, metadata }) });
      await api("/api/eve/runs", { method: "PATCH", body: JSON.stringify({ runId, status: "completed", currentBatch: batches, event: { type: "complete", status: "completed", title: "Project saved", detail: text } }) });
      setProject(finalProject); setMessages([...history, { id: crypto.randomUUID(), role: "assistant", content: text, ...metadata }]);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: text, error: true }]);
    } finally { setBusy(false); setProgress(""); }
  }

  return <section className="eve-ai-workspace">
    <header className="eve-chat-heading"><span><Sparkles className="size-5"/></span><div><div className="eve-eyebrow">AI-first builder</div><h2>Describe the agent. Eve does the work.</h2><p>{projectId ? "Connected to persistent Eve workspace." : "Sign in to save projects, messages, files, and build history to Neon."}</p></div><button className="builder-secondary-button" onClick={() => setSettingsOpen(true)}><KeyRound className="size-4"/>API keys</button>{checkpoint ? <button className="builder-secondary-button" onClick={() => setProject(checkpoint)}><RotateCcw className="size-4"/>Undo</button> : null}</header>
    <div className="eve-chat-thread" aria-live="polite">{messages.map((message) => <article key={message.id} className={`eve-chat-message ${message.role} ${message.error ? "error" : ""}`}><span className="eve-chat-avatar">{message.role === "user" ? <User className="size-4"/> : <Bot className="size-4"/>}</span><div><p>{message.content}</p>{message.plan?.length ? <div className="eve-chat-plan"><strong>Work completed</strong>{message.plan.map((item) => <span key={item}><Check className="size-3.5"/>{item}</span>)}</div> : null}{message.files?.length ? <small>{message.files.length} project files created or changed</small> : null}</div></article>)}{busy || progress ? <article className="eve-chat-message assistant"><span className="eve-chat-avatar"><Bot className="size-4"/></span><div><p className="eve-chat-working"><LoaderCircle className="size-4 animate-spin"/>{progress || "Working"}</p></div></article> : null}</div>
    <form className="eve-chat-composer" onSubmit={submit}><textarea className="builder-textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Build a customer support agent that searches our docs, drafts replies, asks before sending, and deploys to Vercel." disabled={busy}/><div><select className="builder-compact-select" value={project.architectModel} onChange={(event) => setProject({ ...project, architectModel: event.target.value })}>{AGENT_MODEL_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button className="builder-primary-button" type="submit" disabled={!input.trim() || busy}><Send className="size-4"/>{busy ? "Building..." : "Build with Eve"}</button></div></form>
    <ApiSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}/>
  </section>;
}

async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reference = typeof data.requestId === "string" ? ` Reference: ${data.requestId}.` : "";
    throw new Error(`${typeof data.error === "string" ? data.error : `Request failed with ${response.status}.`}${reference}`);
  }
  return data as T;
}
