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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-white">Capabilities & Tools</h2>
        <p className="text-sm text-neutral-400">
          Equip your agent with built-in tools or external MCP connections.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {AVAILABLE_TOOLS.map((tool) => {
          const isSelected = state.selectedTools.includes(tool.id);
          return (
            <label
              key={tool.id}
              className={`relative flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                isSelected
                  ? "border-neutral-500 bg-white/5"
                  : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/50 text-white focus:ring-neutral-500 focus:ring-offset-black"
                  checked={isSelected}
                  onChange={() => toggleTool(tool.id)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{tool.name}</span>
                  {tool.isMcp && (
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
                      MCP Server
                    </span>
                  )}
                </div>
                <span className="text-sm text-neutral-400">{tool.description}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
