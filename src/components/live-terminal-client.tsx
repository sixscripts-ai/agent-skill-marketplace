"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, SquareTerminal } from "lucide-react";
import { Terminal } from "@/components/ai-elements/terminal";
import { executeSkillRunStream } from "@/lib/runner";
import type { SandboxReadiness } from "@/lib/sandbox-status";
import type { ExecutionMode, Skill } from "@/lib/types";
import "@/app/terminal/terminal.css";

const DEFAULT_COMMAND = "node -e \"console.log('sandbox ok', process.version)\"";

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
  const [command, setCommand] = useState(DEFAULT_COMMAND);
  const [mode, setMode] = useState<ExecutionMode>(
    readiness.realShellEnabled && readiness.sandboxAuthStatus !== "missing" ? "real-shell" : "virtual-agent",
  );
  const [output, setOutput] = useState(
    "# Live Terminal\n# Pick a skill package, choose real-shell or virtual-agent, then run.\n# Real shell uses Vercel Sandbox (streaming stdout/stderr).\n# Interactive PTY (stdin) is next — this is the streaming sandbox console.\n\n",
  );
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  const realReady = readiness.realShellEnabled && readiness.sandboxAuthStatus !== "missing";

  async function onRun() {
    if (running) return;
    setRunning(true);
    setRunId(null);
    const banner = `$ ${mode === "real-shell" ? command : `virtual-agent · ${skillSlug}`}\n`;
    setOutput((prev) => `${prev}${banner}`);

    await executeSkillRunStream({
      skillSlug,
      input: mode === "real-shell" ? `Execute sandbox command: ${command}` : `Exercise skill ${skillSlug} in the live terminal console.`,
      executionMode: mode,
      command: mode === "real-shell" ? command : "",
      onRun: (run) => setRunId(run.id),
      onOutput: (chunk) => setOutput((prev) => `${prev}${chunk}`),
      onEvent: (event) => {
        if (event.type === "warning" || event.type === "error") {
          setOutput((prev) => `${prev}\n[${event.type}] ${event.title}: ${event.detail}\n`);
        }
      },
      onError: (error) => {
        setOutput((prev) => `${prev}\n[error] ${error}\n`);
        setRunning(false);
      },
      onComplete: (run) => {
        setRunId(run.id);
        setOutput((prev) => `${prev}\n# complete · run ${run.id} · status ${run.status}\n\n`);
        setRunning(false);
      },
    });
    setRunning(false);
  }

  return (
    <div className="lt-page">
      <div className="lt-top">
        <div>
          <h1>$ live-terminal</h1>
          <p>
            Browser console for testing agent skills against a real sandbox stream — inspired by{" "}
            <a href="https://wterm.dev/" className="text-[var(--lt-heat)] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
              wterm
            </a>{" "}
            and{" "}
            <a href="https://terax.app/#download" className="text-[var(--lt-heat)] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
              Terax
            </a>
            . Streams command output today; interactive PTY is the next slice.
          </p>
        </div>
        <div className="lt-status" aria-label="Sandbox readiness">
          <span className="lt-pill" data-ok={readiness.realShellEnabled}>
            ENABLE_REAL_SANDBOX={String(readiness.realShellEnabled)}
          </span>
          <span className="lt-pill" data-ok={readiness.sandboxAuthStatus !== "missing"}>
            auth:{readiness.sandboxAuthStatus}
          </span>
          <span className="lt-pill" data-ok={readiness.projectLinked}>
            project:{readiness.projectLinked ? "linked" : "unlinked"}
          </span>
        </div>
      </div>

      <div className="lt-shell">
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
            <span>Session</span>
            <span>{running ? "streaming…" : runId ? `run:${runId.slice(0, 8)}` : "idle"}</span>
          </div>

          <div className="lt-controls">
            <div className="lt-field" style={{ flex: "0 0 11rem" }}>
              <label htmlFor="lt-mode">Mode</label>
              <select
                id="lt-mode"
                value={mode}
                onChange={(event) => setMode(event.target.value as ExecutionMode)}
              >
                <option value="real-shell" disabled={!realReady}>
                  real-shell{realReady ? "" : " (unavailable)"}
                </option>
                <option value="virtual-agent">virtual-agent</option>
                <option value="autopilot">autopilot</option>
              </select>
            </div>
            <div className="lt-field" style={{ flex: "1 1 18rem" }}>
              <label htmlFor="lt-cmd">Command</label>
              <input
                id="lt-cmd"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                disabled={mode !== "real-shell"}
                placeholder="bash -lc command"
                spellCheck={false}
              />
            </div>
            <button type="button" className="lt-run" onClick={() => void onRun()} disabled={running || !skillSlug}>
              {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <SquareTerminal className="size-4" aria-hidden="true" />}
              {running ? "Running" : "Start"}
            </button>
          </div>

          <div className="lt-term">
            <Terminal output={output} isStreaming={running} autoScroll className="h-full min-h-[18rem] rounded-none border-0" />
          </div>

          <p className="lt-note">
            {mode === "real-shell" ? (
              realReady ? (
                <>
                  Real shell mounts the selected skill package and streams <code>stdout/stderr</code> over SSE. Network
                  default is deny-all.
                </>
              ) : (
                <>
                  Real shell needs <code>ENABLE_REAL_SANDBOX=true</code> and Vercel sandbox auth. Use virtual-agent locally,
                  or open the skill{" "}
                  <Link href={`/skills/${skillSlug}/run`} className="text-[var(--lt-heat)] underline-offset-2 hover:underline">
                    Runner
                  </Link>
                  .
                </>
              )
            ) : (
              <>
                Virtual/autopilot modes exercise the skill agent loop and stream model/tool events into this console —
                same backend as{" "}
                <Link href={`/skills/${skillSlug}/run`} className="text-[var(--lt-heat)] underline-offset-2 hover:underline">
                  /skills/{skillSlug}/run
                </Link>
                .
              </>
            )}
            {runId ? (
              <>
                {" "}
                Trace:{" "}
                <Link href={`/traces/${runId}`} className="text-[var(--lt-heat)] underline-offset-2 hover:underline">
                  /traces/{runId}
                </Link>
              </>
            ) : null}
          </p>
        </section>
      </div>
    </div>
  );
}
