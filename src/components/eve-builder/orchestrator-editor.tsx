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
    <div className="flex flex-col gap-4 h-full relative">
      {/* Ask AI Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Sparkles className="h-4 w-4 text-[#8ca300]" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border border-border-faint bg-background-base py-2.5 pl-9 pr-3 text-sm text-accent-black placeholder-black-alpha-48 focus:border-heat-100 focus:bg-accent-white focus:outline-none focus:ring-1 focus:ring-heat-100 transition-all duration-200"
            placeholder="Ask Copilot to refine these instructions..."
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
          className="inline-flex items-center justify-center rounded-xl bg-accent-black px-5 py-2.5 text-sm font-semibold text-accent-white shadow-sm hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-accent-black focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Generate
        </button>
      </div>

      {/* Editor Container */}
      <div className="relative flex-1 min-h-[300px] border border-border-faint rounded-xl overflow-hidden bg-background-base flex flex-col">
        <textarea
          value={state.instructions}
          onChange={(e) => updateState({ instructions: e.target.value })}
          className="flex-1 w-full p-5 font-mono text-[13px] text-accent-black leading-relaxed bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-heat-100/50"
          spellCheck={false}
        />
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#8ca300]" />
              <p className="text-sm font-medium text-accent-black">Copilot is thinking...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
