"use client";

import { useEffect, useRef } from "react";
import { CYAN_LANDING_MARKUP } from "@/components/landing-cyan/landing-markup";
import { initCyanLanding } from "@/components/landing-cyan/init-cyan-landing";
import "@/app/landing-cyan.css";

export function CyanLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    return initCyanLanding();
  }, []);

  return (
    <div
      ref={rootRef}
      className="cyan-landing-root"
      dangerouslySetInnerHTML={{ __html: CYAN_LANDING_MARKUP }}
    />
  );
}
