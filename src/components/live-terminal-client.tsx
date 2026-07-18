"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, PlugZap, SquareTerminal, Unplug } from "lucide-react";
import { AI_MODEL_OPTIONS } from "@/lib/ai-model-catalog";
import { DEFAULT_TERMINAL_MODEL } from "@/lib/terminal-models";
import type { SandboxReadiness } from "@/lib/sandbox-status";
import type { Skill } from "@/lib/types";
import { PtyBridge } from "@/components/terminal/pty-bridge";
import "@wterm/react/css";
import "@/app/terminal/terminal.css";

const WTerm = dynamic(
  () => import("@wterm/react").then((mod) => mod.Terminal),
  { ssr: false, loading: () => <div className="lt-term-loading">Loading wterm…</div> },
);

type SessionInfo = {
  sandboxName: string;
  skillSlug: string;
  wsUrl: string;
  token: string;
  cols: number;
  rows: number;
};

type AgentMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

export function LiveTerminalClient({
  skills,
  readiness,
  initialSkillSlug,
}: {
  skills: Skill[];
  readiness: SandboxReadiness;
  initialSkillSlug?: string;
}) {
  const initial = useMemo(() => {
    if (initialSkillSlug && skills.some((skill) => skill.slug === initialSkillSlug)) {
      return initialSkillSlug;
    }
    return skills[0]?.slug ?? "agent-observer";
  }, [initialSkillSlug, skills]);

  const [skillSlug, setSkillSlug] = useState(initial);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [ptyStatus, setPtyStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [command, setCommand] = useState('node -e "console.log(\'sandbox ok\', process.version)"');
  const [executing, setExecuting] = useState(false);
  const [confirmDestructive, setConfirmDestructive] = useState(false);
  const [model, setModel] = useState(DEFAULT_TERMINAL_MODEL);
  const [agentInput, setAgentInput] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    {
      id: "welcome",
      role: "system",
      text: "Connect a sandbox, then ask the agent to run code. Default model: Grok 4.3.",
    },
  ]);

  const writeRef = useRef<((data: string | Uint8Array) => void) | null>(null);
  const bridgeRef = useRef<PtyBridge | null>(null);
  const termApiRef = useRef<{ write: (data: string | Uint8Array) => void; resize: (cols: number, rows: number) => void; focus: () => void } | null>(null);

  const realReady = readiness.realShellEnabled && readiness.sandboxAuthStatus !== "missing";

  const mirror = useCallback((chunk: string) => {
    writeRef.current?.(chunk);
  }, []);

  useEffect(() => {
    return () => {
      bridgeRef.current?.close();
      bridgeRef.current = null;
    };
  }, []);

  async function connect() {
    if (connecting || !skillSlug) return;
    setConnecting(true);
    setError(null);
    setPtyStatus("creating session…");
    try {
      bridgeRef.current?.close();
      const response = await fetch("/api/terminal/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillSlug }),
      });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.message || "Failed to create terminal session.");
      }

      const next: SessionInfo = {
        sandboxName: payload.sandboxName,
        skillSlug: payload.skillSlug,
        wsUrl: payload.wsUrl,
        token: payload.token,
        cols: payload.cols ?? 100,
        rows: payload.rows ?? 32,
      };
      setSession(next);

      mirror(`\r\n# session ${next.sandboxName}\r\n# skill ${next.skillSlug} · mounted ${payload.mountedFiles ?? 0} file(s)\r\n`);

      const bridge = new PtyBridge(
        next.wsUrl,
        next.token,
        {
          onData: (data) => writeRef.current?.(data),
          onOpen: () => setPtyStatus("connected"),
          onClose: (reason) => setPtyStatus(reason ? `closed: ${reason}` : "closed"),
          onError: (message) => {
            setError(message);
            setPtyStatus("error");
          },
          onStatus: (message) => setPtyStatus(message),
        },
        { cols: next.cols, rows: next.rows },
      );
      bridgeRef.current = bridge;
      bridge.connect();
      termApiRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed.");
      setPtyStatus("error");
      setSession(null);
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    const name = session?.sandboxName;
    bridgeRef.current?.close();
    bridgeRef.current = null;
    setSession(null);
    setPtyStatus("disconnected");
    if (!name) return;
    try {
      await fetch("/api/terminal/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxName: name }),
      });
    } catch {
      // best-effort stop
    }
    mirror("\r\n# disconnected\r\n");
  }

  async function runCommand() {
    if (!session || executing) return;
    setExecuting(true);
    setError(null);
    mirror(`\r\n$ ${command}\r\n`);
    try {
      const response = await fetch("/api/terminal/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sandboxName: session.sandboxName,
          command,
          confirmDestructive,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.message || "Exec failed.");
      }
      mirror(`${payload.output || ""}\r\n# exit ${payload.exitCode}\r\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Exec failed.";
      setError(message);
      mirror(`\r\n[error] ${message}\r\n`);
    } finally {
      setExecuting(false);
    }
  }

  async function runAgent() {
    if (!session || agentBusy || !agentInput.trim()) return;
    const prompt = agentInput.trim();
    setAgentInput("");
    setAgentBusy(true);
    setError(null);
    const userMsg: AgentMessage = { id: `u-${Date.now()}`, role: "user", text: prompt };
    setAgentMessages((prev) => [...prev, userMsg]);
    mirror(`\r\n# agent · ${model}\r\n# prompt: ${prompt}\r\n`);

    try {
      let apiKeys = {};
      try {
        apiKeys = JSON.parse(localStorage.getItem("ai_api_keys") || "{}");
      } catch {
        apiKeys = {};
      }

      const response = await fetch("/api/terminal/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-keys": JSON.stringify(apiKeys),
        },
        body: JSON.stringify({
          sandboxName: session.sandboxName,
          model,
          confirmDestructive,
          messages: [
            {
              id: userMsg.id,
              role: "user",
              parts: [{ type: "text", text: prompt }],
            },
          ],
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || `Agent failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No agent stream.");
      const decoder = new TextDecoder();
      let assistant = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n");
        buffer = chunks.pop() || "";
        for (const line of chunks) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const event = JSON.parse(data) as {
              type?: string;
              delta?: string;
              textDelta?: string;
              output?: unknown;
              input?: unknown;
              toolName?: string;
            };
            if (event.type === "text-delta" || event.type === "text") {
              const delta = event.delta || event.textDelta || "";
              if (delta) {
                assistant += delta;
                mirror(delta);
              }
            }
            if (event.type === "tool-output-available" || event.type === "tool-result") {
              const output = typeof event.output === "object" && event.output && "output" in (event.output as object)
                ? String((event.output as { output?: string }).output ?? "")
                : typeof event.output === "string"
                  ? event.output
                  : JSON.stringify(event.output ?? "", null, 0);
              if (output) {
                mirror(`\r\n# tool ${event.toolName || "run"}\r\n${output}\r\n`);
                assistant += `\n[tool ${event.toolName || "run"}]\n${output}\n`;
              }
            }
            // UI message stream parts may nest differently — capture plain text deltas broadly
            if (typeof (event as { delta?: string }).delta === "string" && !event.type) {
              assistant += (event as { delta: string }).delta;
              mirror((event as { delta: string }).delta);
            }
          } catch {
            // ignore non-JSON SSE lines
          }
        }
      }

      setAgentMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: assistant.trim() || "(no text response)" },
      ]);
      mirror("\r\n# agent complete\r\n");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Agent failed.";
      setError(message);
      setAgentMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: "system", text: message }]);
      mirror(`\r\n[agent error] ${message}\r\n`);
    } finally {
      setAgentBusy(false);
    }
  }

  return (
    <div className="lt-page">
      <div className="lt-top">
        <div>
          <h1>$ live-terminal</h1>
          <p>
            Real{" "}
            <a href="https://wterm.dev/" className="text-[var(--lt-heat)] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
              wterm
            </a>{" "}
            + Vercel Sandbox PTY, with a Grok 4.3 agent that runs commands in the same sandbox.
          </p>
        </div>
        <div className="lt-status" aria-label="Sandbox readiness">
          <span className="lt-pill" data-ok={readiness.realShellEnabled}>
            ENABLE_REAL_SANDBOX={String(readiness.realShellEnabled)}
          </span>
          <span className="lt-pill" data-ok={readiness.sandboxAuthStatus !== "missing"}>
            auth:{readiness.sandboxAuthStatus}
          </span>
          <span className="lt-pill" data-ok={Boolean(session)}>
            pty:{ptyStatus}
          </span>
        </div>
      </div>

      <div className="lt-shell lt-shell--agent">
        <aside className="lt-side">
          <div className="lt-side__head">
            <span>Packages</span>
            <span>{skills.length}</span>
          </div>
          <div className="lt-side__list">
            {skills.map((skill) => (
              <button
                key={skill.slug}
                type="button"
                className="lt-skill"
                data-active={skillSlug === skill.slug}
                disabled={Boolean(session)}
                onClick={() => setSkillSlug(skill.slug)}
              >
                <strong>{skill.slug}</strong>
                <span>
                  {skill.currentVersion} · {skill.visibility === "private" ? "draft" : "live"}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="lt-main">
          <div className="lt-main__head">
            <span>wterm · sandbox</span>
            <span>{session ? session.sandboxName : "not connected"}</span>
          </div>

          <div className="lt-controls">
            <button
              type="button"
              className="lt-run"
              onClick={() => void (session ? disconnect() : connect())}
              disabled={connecting || (!session && !realReady)}
            >
              {connecting ? <Loader2 className="size-4 animate-spin" /> : session ? <Unplug className="size-4" /> : <PlugZap className="size-4" />}
              {connecting ? "Connecting" : session ? "Disconnect" : "Connect"}
            </button>
            <div className="lt-field" style={{ flex: "1 1 18rem" }}>
              <label htmlFor="lt-cmd">Exec (agent channel)</label>
              <input
                id="lt-cmd"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                disabled={!session || executing}
                spellCheck={false}
              />
            </div>
            <button type="button" className="lt-run lt-run--ghost" onClick={() => void runCommand()} disabled={!session || executing}>
              {executing ? <Loader2 className="size-4 animate-spin" /> : <SquareTerminal className="size-4" />}
              Run
            </button>
            <label className="lt-check">
              <input
                type="checkbox"
                checked={confirmDestructive}
                onChange={(event) => setConfirmDestructive(event.target.checked)}
              />
              confirm destructive
            </label>
          </div>

          <div className="lt-term lt-term--wterm">
            <WTerm
              className="lt-wterm"
              theme="light"
              cols={100}
              rows={28}
              autoResize
              cursorBlink
              onReady={(wt) => {
                writeRef.current = (data) => wt.write(data);
                termApiRef.current = {
                  write: (data) => wt.write(data),
                  resize: (cols, rows) => wt.resize(cols, rows),
                  focus: () => wt.focus(),
                };
                wt.write("# wterm ready — Connect to open a Vercel Sandbox PTY\r\n");
              }}
              onData={(data) => {
                bridgeRef.current?.send(data);
              }}
              onResize={(cols, rows) => {
                bridgeRef.current?.resize(cols, rows);
              }}
            />
          </div>

          {error ? <p className="lt-error">{error}</p> : null}
          <p className="lt-note">
            {realReady ? (
              <>
                Interactive channel uses <code>openInteractive</code> → wterm. Agent/exec uses <code>runCommand</code> on the
                same sandbox and mirrors output here. Network default: deny-all.
              </>
            ) : (
              <>
                Needs <code>ENABLE_REAL_SANDBOX=true</code> and Vercel sandbox auth. Open a skill{" "}
                <Link href={`/skills/${skillSlug}/run`} className="text-[var(--lt-heat)] underline-offset-2 hover:underline">
                  Runner
                </Link>{" "}
                as fallback.
              </>
            )}
          </p>
        </section>

        <aside className="lt-agent">
          <div className="lt-side__head">
            <span>Agent</span>
            <span>{model.split("/")[1] || model}</span>
          </div>
          <div className="lt-field">
            <label htmlFor="lt-model">Model</label>
            <select id="lt-model" value={model} onChange={(event) => setModel(event.target.value)}>
              {AI_MODEL_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="lt-agent__log">
            {agentMessages.map((message) => (
              <div key={message.id} className="lt-agent__msg" data-role={message.role}>
                <strong>{message.role}</strong>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          <div className="lt-agent__compose">
            <textarea
              value={agentInput}
              onChange={(event) => setAgentInput(event.target.value)}
              placeholder={session ? "Ask the agent to run code…" : "Connect a session first"}
              disabled={!session || agentBusy}
              rows={3}
            />
            <button type="button" className="lt-run" onClick={() => void runAgent()} disabled={!session || agentBusy || !agentInput.trim()}>
              {agentBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              {agentBusy ? "Running" : "Ask agent"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
