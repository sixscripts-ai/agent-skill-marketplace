"use client";

import { useEffect, useMemo, useState } from "react";

const TABS = ["Browse", "Run", "Trace"] as const;

const SCENES: Record<(typeof TABS)[number], { meta: string; lines: string[]; status: string }> = {
  Browse: {
    meta: "[ .SKILL ]",
    status: "Inspecting…",
    lines: [
      "# skill: code-review",
      "permissions:",
      "  fs: read",
      "  network: deny-all",
      "status: ready",
      "# inspect → evaluate → run",
    ],
  },
  Run: {
    meta: "[ SANDBOX ]",
    status: "Running…",
    lines: [
      "$ python3 scripts/review.py --path ./src",
      "mounted: 14 workspace files",
      "network: deny-all",
      "latency: 2.1s",
      "exit: 0",
      "# artifacts ready",
    ],
  },
  Trace: {
    meta: "[ TRACE ]",
    status: "Streaming…",
    lines: [
      "01 read_files ……… ok",
      "02 shell ……… ok",
      "03 artifacts ……… ok",
      "summary: permissions honored",
      "mode: autopilot",
      "# install when ready",
    ],
  },
};

export function LandingPlayground() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Browse");
  const [visible, setVisible] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const scene = SCENES[tab];
  const lines = useMemo(() => scene.lines, [scene.lines]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setVisible(lines.length);
      return;
    }
    setVisible(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setVisible(i);
      if (i >= lines.length) window.clearInterval(id);
    }, 220);
    return () => window.clearInterval(id);
  }, [tab, lines.length, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setTab((current) => {
        const idx = TABS.indexOf(current);
        return TABS[(idx + 1) % TABS.length];
      });
    }, 4200);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <div className="lp-play" aria-label="Product preview">
      <div className="lp-play__tabs" role="tablist" aria-label="Skill workflow">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            className="lp-play__tab"
            data-active={tab === name ? "true" : "false"}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="lp-play__body">
        <div className="lp-play__meta">
          <span>{scene.meta}</span>
          <span className="lp-play__status">
            <span className="lp-play__dot" aria-hidden="true" />
            {scene.status}
          </span>
        </div>
        <pre className="lp-code" aria-live="polite">
          {lines.slice(0, visible).map((line, index) => {
            const heat = line.startsWith("status:") || line.startsWith("exit:") || line.includes("……… ok");
            const muted = line.startsWith("#") || line.startsWith("$");
            return (
              <span key={`${tab}-${index}`} className={heat ? "lp-code__heat" : muted ? "lp-code__muted" : undefined}>
                {line}
                {"\n"}
              </span>
            );
          })}
          {!reduceMotion && visible < lines.length ? <span className="lp-code__caret" aria-hidden="true" /> : null}
        </pre>
      </div>
    </div>
  );
}
