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
      className="h-10 rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-wait disabled:opacity-60"
    >
      {status === "forking" ? "Forking..." : status === "error" ? "Try fork again" : "Fork / remix"}
    </button>
  );
}
