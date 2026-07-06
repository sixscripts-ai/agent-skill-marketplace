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
        <label htmlFor="agentName" className="flex items-center gap-2 text-xs font-semibold text-accent-black">
          <Box className="h-3.5 w-3.5 text-black-alpha-48" />
          Agent Name
        </label>
        <div className="relative group">
          <input
            id="agentName"
            type="text"
            value={state.agentName}
            onChange={(e) => updateState({ agentName: e.target.value })}
            className="w-full rounded-md border border-border-faint bg-background-lighter px-3 py-2.5 text-sm text-accent-black placeholder-black-alpha-48 focus:border-heat-100 focus:bg-accent-white focus:outline-none focus:ring-1 focus:ring-heat-100 transition-all duration-200"
            placeholder="e.g. data-researcher"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="model" className="flex items-center gap-2 text-xs font-semibold text-accent-black">
          <Cpu className="h-3.5 w-3.5 text-black-alpha-48" />
          Base Model
        </label>
        <div className="relative group">
          <select
            id="model"
            value={state.model}
            onChange={(e) => updateState({ model: e.target.value })}
            className="w-full appearance-none rounded-md border border-border-faint bg-background-lighter px-3 py-2.5 text-sm text-accent-black focus:border-heat-100 focus:bg-accent-white focus:outline-none focus:ring-1 focus:ring-heat-100 transition-all duration-200"
          >
            <option value="anthropic/claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
            <option value="anthropic/claude-3-opus-20240229">Claude 3 Opus</option>
            <option value="openai/gpt-4o">GPT-4o</option>
            <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black-alpha-48 group-hover:text-accent-black transition-colors">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
