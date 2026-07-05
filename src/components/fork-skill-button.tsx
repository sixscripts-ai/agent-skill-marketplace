"use client";

import { useState } from "react";
import type { Skill } from "@/lib/types";

export function ForkSkillButton({ slug }: { slug: string }) {
  const [status, setStatus] = useState<"idle" | "forking" | "error">("idle");

  async function forkSkill() {
    setStatus("forking");
    const response = await fetch(`/api/skills/${slug}/fork`, { method: "POST" });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    const fork = (await response.json()) as Skill;
    window.location.href = `/builder/${fork.slug}`;
  }

  return (
    <button
      onClick={forkSkill}
      disabled={status === "forking"}
      className="h-10 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-60"
    >
      {status === "forking" ? "Forking..." : status === "error" ? "Try fork again" : "Fork / remix"}
    </button>
  );
}
