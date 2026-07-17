"use client";

import { ChevronDown, Box, Cpu } from "lucide-react";
import type { AgentState } from "@/lib/eve/export-utils";

export function MetadataPanel({
  state,
  updateState,
}: {
  state: AgentState;
  updateState: (updates: Partial<AgentState>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="agentName" className="flex items-center gap-2 text-xs font-semibold text-white">
          <Box className="h-3.5 w-3.5 text-neutral-400" />
          Agent Name
        </label>
        <div className="relative group">
          <input
            id="agentName"
            type="text"
            value={state.agentName}
            onChange={(e) => updateState({ agentName: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-heat-100 focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-heat-100 transition-all duration-200"
            placeholder="e.g. data-researcher"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="model" className="flex items-center gap-2 text-xs font-semibold text-white">
          <Cpu className="h-3.5 w-3.5 text-neutral-400" />
          Base Model
        </label>
        <div className="relative group">
          <select
            id="model"
            value={state.model}
            onChange={(e) => updateState({ model: e.target.value })}
            className="w-full appearance-none rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-heat-100 focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-heat-100 transition-all duration-200"
          >
            <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="anthropic/claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
            <option value="openai/gpt-4o">GPT-4o</option>
            <option value="xai/grok-2-latest">Grok 2</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-white transition-colors">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
