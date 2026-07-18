"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bot, Check, KeyRound, LoaderCircle, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { architectAgentProject, type EveArchitectMessage } from "@/app/actions/agent-project-architect";
import { AGENT_MODEL_OPTIONS, createDefaultAgentProject, mergeArchitectProject, runAgentTest, synchronizeAgentProject, type AgentProject } from "@/lib/eve/agent-project";
import { ApiSettingsModal } from "../api-settings-modal";

type Message = EveArchitectMessage & { id: string; plan?: string[]; files?: string[]; error?: boolean };
const welcome: Message = { id: "welcome", role: "assistant", content: "Describe the agent you need. I will create the brief, models, tools, permissions, tests, and runnable project files. I will ask only when a missing detail blocks a safe build." };

export function EveAiChat() {
  const [project, setProject] = useState<AgentProject>(() => createDefaultAgentProject());
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checkpoint, setCheckpoint] = useState<AgentProject | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("eve_agent_project");
      const chat = localStorage.getItem("eve_agent_chat");
      if (saved) setProject(synchronizeAgentProject(JSON.parse(saved) as AgentProject));
      if (chat) setMessages(JSON.parse(chat) as Message[]);
    } catch { /* ignore malformed browser data */ }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const request = input.trim();
    if (!request || busy) return;
    const user: Message = { id: crypto.randomUUID(), role: "user", content: request };
    const history = [...messages, user];
    setMessages(history); setInput(""); setBusy(true); setCheckpoint(project);
    let working = project;
    let continuation: string | undefined;
    let batches = 0;
    const plans: string[] = [];
    const files: string[] = [];
    try {
      const keys = JSON.parse(localStorage.getItem("ai_api_keys") || "{}") as Record<string, string>;
      do {
        batches += 1;
        setProgress(continuation ? `Continuing build · batch ${batches}` : "Interpreting request and generating the project");
        const result = await architectAgentProject(request, working, working.architectModel, keys, history.map(({ role, content }) => ({ role, content })), continuation);
        if (result.status === "clarify") {
          const text = [result.message, ...result.questions].filter(Boolean).join("\n\n");
          const next = [...history, { id: crypto.randomUUID(), role: "assistant" as const, content: text, plan: result.plan }];
          setMessages(next); localStorage.setItem("eve_agent_chat", JSON.stringify(next)); return;
        }
        working = mergeArchitectProject(working, result.update);
        plans.push(...result.plan);
        if (Array.isArray(result.update.files)) files.push(...result.update.files.map((file) => file.path).filter(Boolean));
        continuation = result.complete ? undefined : result.continuationPrompt;
      } while (continuation && batches < 5);

      working = working.tests.reduce((state, test) => runAgentTest(state, test.id), working);
      const finalProject = synchronizeAgentProject({ ...working, changes: [{ id: crypto.randomUUID(), label: request, createdAt: new Date().toISOString(), files: [...new Set(files)] }, ...project.changes] });
      const text = continuation ? "I completed five build batches. Send ‘continue building’ to add the remaining modules." : "The project is built, tested, and synchronized with the inspector below.";
      const next = [...history, { id: crypto.randomUUID(), role: "assistant" as const, content: text, plan: [...new Set(plans)], files: [...new Set(files)] }];
      localStorage.setItem("eve_agent_project", JSON.stringify(finalProject));
      localStorage.setItem("eve_agent_chat", JSON.stringify(next));
      setProject(finalProject); setMessages(next);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: error instanceof Error ? error.message : String(error), error: true }]);
    } finally { setBusy(false); setProgress(""); }
  }

  return <section className="eve-ai-workspace">
    <header className="eve-chat-heading"><span><Sparkles className="size-5"/></span><div><div className="eve-eyebrow">AI-first builder</div><h2>Describe the agent. Eve does the work.</h2><p>The inspector below is for review and overrides; it is not required setup.</p></div><button className="builder-secondary-button" onClick={() => setSettingsOpen(true)}><KeyRound className="size-4"/>API keys</button>{checkpoint ? <button className="builder-secondary-button" onClick={() => { localStorage.setItem("eve_agent_project", JSON.stringify(checkpoint)); window.location.reload(); }}><RotateCcw className="size-4"/>Undo</button> : null}</header>
    <div className="eve-chat-thread" aria-live="polite">{messages.map((message) => <article key={message.id} className={`eve-chat-message ${message.role} ${message.error ? "error" : ""}`}><span className="eve-chat-avatar">{message.role === "user" ? <User className="size-4"/> : <Bot className="size-4"/>}</span><div><p>{message.content}</p>{message.plan?.length ? <div className="eve-chat-plan"><strong>Work completed</strong>{message.plan.map((item) => <span key={item}><Check className="size-3.5"/>{item}</span>)}</div> : null}{message.files?.length ? <small>{message.files.length} project files created or changed</small> : null}</div></article>)}{busy ? <article className="eve-chat-message assistant"><span className="eve-chat-avatar"><Bot className="size-4"/></span><div><p className="eve-chat-working"><LoaderCircle className="size-4 animate-spin"/>{progress}</p></div></article> : null}</div>
    <form className="eve-chat-composer" onSubmit={submit}><textarea className="builder-textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Build a customer support agent that searches our docs, drafts replies, asks before sending, uses Grok for complex cases, and deploys to Vercel." disabled={busy}/><div><select className="builder-compact-select" value={project.architectModel} onChange={(event) => setProject({ ...project, architectModel: event.target.value })}>{AGENT_MODEL_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button className="builder-primary-button" type="submit" disabled={!input.trim() || busy}><Send className="size-4"/>{busy ? "Building..." : "Build with Eve"}</button></div></form>
    <ApiSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}/>
  </section>;
}
