"use client";

import { Box, ChevronDown, Cpu } from "lucide-react";
import type { AgentState } from "@/lib/eve/export-utils";

export const EVE_MODEL_OPTIONS = [
  ["google/gemini-2.5-flash", "Gemini 2.5 Flash"],
  ["google/gemini-2.5-pro", "Gemini 2.5 Pro"],
  ["xai/grok-4.3", "Grok 4.3"],
  ["xai/grok-4.5", "Grok 4.5"],
  ["groq/llama-3.3-70b-versatile", "Llama 3.3 (Groq)"],
  ["groq/mixtral-8x7b-32768", "Mixtral (Groq)"],
  ["deepseek/deepseek-v4-flash", "DeepSeek V4 Flash"],
  ["deepseek/deepseek-v4-pro", "DeepSeek V4 Pro"],
  ["openai/gpt-4o", "GPT-4o"],
  ["anthropic/claude-3-5-sonnet-20240620", "Claude 3.5 Sonnet"],
] as const;

export function MetadataPanel({ state, updateState }: { state: AgentState; updateState: (updates: Partial<AgentState>) => void }) {
  return <div className="flex flex-col gap-5">
    <label className="flex flex-col gap-1.5" htmlFor="agentName"><span className="flex items-center gap-2 text-xs font-semibold text-foreground"><Box className="size-3.5 text-muted-foreground"/>Agent name</span><input id="agentName" value={state.agentName} onChange={(event)=>updateState({agentName:event.target.value})} className="builder-input" placeholder="data-researcher"/></label>
    <label className="flex flex-col gap-1.5" htmlFor="model"><span className="flex items-center gap-2 text-xs font-semibold text-foreground"><Cpu className="size-3.5 text-muted-foreground"/>Base model</span><span className="relative"><select id="model" value={state.model} onChange={(event)=>updateState({model:event.target.value})} className="builder-input appearance-none pr-9">{EVE_MODEL_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/></span></label>
  </div>;
}
