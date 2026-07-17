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
  const [error, setError] = useState<string | null>(null);

  const handleAskCopilot = async () => {
    if (!prompt.trim()) return;

    // Check if user has any API key stored
    const storedKeys = typeof window !== "undefined" ? localStorage.getItem("ai_api_keys") : null;
    const apiKeys: Record<string, string> = storedKeys ? JSON.parse(storedKeys) : {};
    const hasKey = Object.values(apiKeys).some((v) => v && v.trim().length > 0);
    if (!hasKey) {
      setError("No API key found. Click Settings (top-right) → enter your Google Gemini or OpenAI key → Save Keys → try again.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await generateCopilotRefinement(prompt, state.instructions, state.model, apiKeys);
      if (response) {
        updateState({ instructions: response });
        setPrompt("");
      } else {
        setError("Copilot returned an empty response. Check your API key in Settings.");
      }
    } catch (err: unknown) {
      console.error("Failed to generate instructions:", err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("API Key") || message.includes("403") || message.includes("identity") || message.includes("401")) {
        setError("Invalid API key. Open Settings and verify your key for the selected model.");
      } else {
        setError(`Copilot error: ${message.slice(0, 200)}`);
      }
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
            className="block w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-600 focus:border-heat-100 focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-heat-100 transition-all duration-200"
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
          className="inline-flex items-center justify-center rounded-xl bg-heat-100 px-5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-heat-200 focus:outline-none focus:ring-2 focus:ring-heat-100 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Generate
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 text-red-600 hover:text-red-400">✕</button>
        </div>
      )}

      {/* Editor Container */}
      <div className="relative flex-1 min-h-[300px] border border-white/10 rounded-xl overflow-hidden bg-[#0a0a0a] flex flex-col">
        <textarea
          value={state.instructions}
          onChange={(e) => updateState({ instructions: e.target.value })}
          className="flex-1 w-full p-5 font-mono text-[13px] text-white leading-relaxed bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-heat-100/50"
          spellCheck={false}
        />
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#8ca300]" />
              <p className="text-sm font-medium text-white">Copilot is thinking...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
