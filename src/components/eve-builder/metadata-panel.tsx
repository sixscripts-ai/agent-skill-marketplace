"use client";

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
        <label htmlFor="agentName" className="text-sm font-medium text-neutral-200">
          Agent Name
        </label>
        <input
          id="agentName"
          type="text"
          value={state.agentName}
          onChange={(e) => updateState({ agentName: e.target.value })}
          className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors"
          placeholder="e.g. data-researcher"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="model" className="text-sm font-medium text-neutral-200">
          Base Model
        </label>
        <select
          id="model"
          value={state.model}
          onChange={(e) => updateState({ model: e.target.value })}
          className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors appearance-none"
        >
          <option value="anthropic/claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
          <option value="anthropic/claude-3-opus-20240229">Claude 3 Opus</option>
          <option value="openai/gpt-4o">GPT-4o</option>
          <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
        </select>
        <div className="pointer-events-none absolute right-3 top-[calc(50%+8px)] -translate-y-1/2 text-neutral-400">
          {/* Custom dropdown arrow could go here */}
        </div>
      </div>
    </div>
  );
}
