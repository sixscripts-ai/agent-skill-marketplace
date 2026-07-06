"use client";

import { useState } from "react";
import { MetadataPanel } from "./metadata-panel";
import { OrchestratorEditor } from "./orchestrator-editor";
import { CapabilitiesPanel } from "./capabilities-panel";
import { PreviewExportPanel } from "./preview-export-panel";
import { DEFAULT_INSTRUCTIONS_MD } from "@/lib/eve/eve-templates";
import type { AgentState } from "@/lib/eve/export-utils";

export function EveBuilderClient() {
  const [state, setState] = useState<AgentState>({
    agentName: "my-eve-agent",
    model: "anthropic/claude-3-5-sonnet-20240620",
    instructions: DEFAULT_INSTRUCTIONS_MD,
    selectedTools: [],
  });

  const updateState = (updates: Partial<AgentState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start w-full text-white">
      {/* Left Column: Form & Config */}
      <div className="flex w-full flex-col gap-6 md:w-2/3">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Eve Agent Builder</h1>
          <p className="text-neutral-400 text-sm">
            Scaffold a standalone AI agent using the Eve filesystem-first framework.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-6 shadow-sm">
          <MetadataPanel state={state} updateState={updateState} />
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0A0A0A] shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-white/10 bg-[#111] px-6 py-4">
            <h2 className="text-lg font-medium">Orchestrator Instructions</h2>
            <p className="text-xs text-neutral-400 mt-1">Define your agent's identity, core loops, and decision-making boundaries.</p>
          </div>
          <div className="p-6">
            <OrchestratorEditor state={state} updateState={updateState} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-6 shadow-sm">
          <CapabilitiesPanel state={state} updateState={updateState} />
        </div>
      </div>

      {/* Right Column: Preview & Export */}
      <div className="w-full md:w-1/3 md:sticky md:top-20">
        <PreviewExportPanel state={state} />
      </div>
    </div>
  );
}
