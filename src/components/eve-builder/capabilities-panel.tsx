"use client";

import { AVAILABLE_TOOLS } from "@/lib/eve/eve-templates";
import type { AgentState } from "@/lib/eve/export-utils";

export function CapabilitiesPanel({
  state,
  updateState,
}: {
  state: AgentState;
  updateState: (updates: Partial<AgentState>) => void;
}) {
  const toggleTool = (toolId: string) => {
    const isSelected = state.selectedTools.includes(toolId);
    if (isSelected) {
      updateState({
        selectedTools: state.selectedTools.filter((t) => t !== toolId),
      });
    } else {
      updateState({
        selectedTools: [...state.selectedTools, toolId],
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {AVAILABLE_TOOLS.map((tool) => {
        const isSelected = state.selectedTools.includes(tool.id);
        return (
          <label
            key={tool.id}
            className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
              isSelected
                ? "border-heat-100 bg-[#f5ffcc]/50 shadow-sm"
                : "border-border-faint hover:border-border-muted hover:bg-background-lighter bg-accent-white shadow-sm"
            }`}
          >
            <div className="flex h-5 items-center mt-0.5">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border-faint text-heat-100 focus:ring-heat-100 focus:ring-offset-background-base transition-colors"
                checked={isSelected}
                onChange={() => toggleTool(tool.id)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-accent-black">{tool.name}</span>
                {tool.isMcp && (
                  <span className="inline-flex items-center rounded-full bg-[#f5ffcc] px-2 py-0.5 text-[10px] font-bold text-[#668000] tracking-wider uppercase ring-1 ring-inset ring-[#ccff00]/50">
                    MCP Server
                  </span>
                )}
              </div>
              <span className="text-xs text-black-alpha-48 leading-relaxed">{tool.description}</span>
            </div>
          </label>
        );
      })}
    </div>
  );
}
