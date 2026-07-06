"use client";

import { Download, FileText, Folder, FileJson, FileCode } from "lucide-react";
import { generateEveZip, type AgentState } from "@/lib/eve/export-utils";
import { AVAILABLE_TOOLS } from "@/lib/eve/eve-templates";

export function PreviewExportPanel({ state }: { state: AgentState }) {
  const agentName = state.agentName || "agent";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#0A0A0A] p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-white">Preview & Export</h2>
        <p className="text-sm text-neutral-400">
          Your compiled filesystem tree.
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/50 p-4 font-mono text-sm text-neutral-300">
        <div className="flex items-center gap-2 text-white">
          <Folder className="h-4 w-4 text-blue-400 fill-current" />
          <span>{agentName}/</span>
        </div>
        
        <div className="ml-4 mt-2 flex flex-col gap-2 border-l border-white/10 pl-4">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-yellow-400" />
            <span>agent.ts</span>
            {state.selectedTools.includes('firecrawl_mcp') && (
              <span className="ml-2 text-[10px] text-neutral-500">(MCP configured)</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-400" />
            <span>instructions.md</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-blue-400 fill-current" />
              <span>tools/</span>
            </div>
            {state.selectedTools.filter(id => {
              const def = AVAILABLE_TOOLS.find(t => t.id === id);
              return def && !def.isMcp;
            }).length > 0 ? (
              <div className="ml-4 flex flex-col gap-2 border-l border-white/10 pl-4">
                {state.selectedTools.map((toolId) => {
                  const def = AVAILABLE_TOOLS.find(t => t.id === toolId);
                  if (def && !def.isMcp) {
                    return (
                      <div key={toolId} className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-yellow-400" />
                        <span>{toolId}.ts</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="ml-4 flex items-center gap-2 border-l border-white/10 pl-4">
                <FileJson className="h-4 w-4 text-neutral-600" />
                <span className="text-neutral-500 italic">.gitkeep</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-blue-400 fill-current" />
              <span>skills/</span>
            </div>
            <div className="ml-4 flex items-center gap-2 border-l border-white/10 pl-4">
              <FileJson className="h-4 w-4 text-neutral-600" />
              <span className="text-neutral-500 italic">.gitkeep</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => generateEveZip(state)}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0A0A0A] transition-colors"
      >
        <Download className="h-4 w-4" />
        Download Agent (.zip)
      </button>
    </div>
  );
}
