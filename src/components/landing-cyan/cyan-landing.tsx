"use client";

import { useEffect, useRef } from "react";
import { CYAN_LANDING_MARKUP } from "@/components/landing-cyan/landing-markup";
import { initCyanLanding } from "@/components/landing-cyan/init-cyan-landing";
import "@/app/landing-cyan.css";

export function CyanLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!rootRef.current || initialized.current) return;
    initialized.current = true;

    const root = document.documentElement;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("agent-skills-cyan-theme");
    } catch {
      stored = null;
    }
    if (stored === "light" || stored === "dark") {
      root.dataset.theme = stored;
    } else if (!root.dataset.theme) {
      root.dataset.theme = "dark";
    }

    initCyanLanding();
  }, []);

  return (
    <div
      ref={rootRef}
      className="cyan-landing-root"
      dangerouslySetInnerHTML={{ __html: CYAN_LANDING_MARKUP }}
    />
  );
}
