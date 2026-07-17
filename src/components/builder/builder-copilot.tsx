"use client";

import type { FormEvent } from "react";
import { Bot, KeyRound, Send, Sparkles, Square } from "lucide-react";

export type BuilderCopilotMessage = {
  id: string;
  role: string;
  parts: Array<{
    type: string;
    text?: string;
    toolCallId?: string;
    state?: string;
    input?: { markdown?: string };
    output?: { updatedContent?: string };
  }>;
};

const starterPrompts = [
  {
    label: "Create from an idea",
    prompt:
      "Create a complete production-ready SKILL.md from my idea. Ask only for information that is essential, then update the editor directly.",
  },
