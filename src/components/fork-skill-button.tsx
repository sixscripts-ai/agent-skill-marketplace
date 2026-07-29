"use client";

import { useState } from "react";
import { GitFork } from "lucide-react";
import { FirebenchButton } from "@/components/firebench";
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
    <FirebenchButton
      type="button"
      variant="ghost"
      onClick={forkSkill}
      disabled={status === "forking"}
      data-testid="fork-skill"
      aria-label="Fork or remix this skill"
    >
      <GitFork className="size-4" aria-hidden="true" />
      {status === "forking" ? "Forking..." : status === "error" ? "Try fork again" : "Fork / remix"}
    </FirebenchButton>
  );
}
