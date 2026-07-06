"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import type { AgentState } from "@/lib/eve/export-utils";
import { generateCopilotRefinement } from "@/app/actions/copilot";

export function OrchestratorEditor({
  state,
  updateState,
}: {
  state: AgentState;
  updateState: (updates: Partial<AgentState>) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAskCopilot = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await generateCopilotRefinement(prompt, state.instructions);
      if (response) {
        updateState({ instructions: response });
        setPrompt("");
      }
    } catch (error) {
      console.error("Failed to generate instructions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Ask AI Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Sparkles className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-white/10 bg-black/50 py-2 pl-10 pr-3 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            placeholder="Ask AI to refine these instructions (e.g. 'Add a goal to verify links')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAskCopilot();
              }
            }}
          />
        </div>
        <button
          onClick={handleAskCopilot}
          disabled={isLoading || !prompt.trim()}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-black shadow-sm hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Ask Copilot
        </button>
      </div>

      {/* Markdown Editor */}
      <div className="relative">
        <textarea
          value={state.instructions}
          onChange={(e) => updateState({ instructions: e.target.value })}
          className="min-h-[400px] w-full rounded-md border border-white/10 bg-black/50 p-4 font-mono text-sm text-neutral-300 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          spellCheck={false}
        />
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <p className="text-sm text-neutral-300">AI Copilot is thinking...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
