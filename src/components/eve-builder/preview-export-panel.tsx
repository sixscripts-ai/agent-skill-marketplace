"use client";

import { Download, FileText, Folder, FileJson, FileCode } from "lucide-react";
import { generateEveZip, type AgentState } from "@/lib/eve/export-utils";
import { AVAILABLE_TOOLS } from "@/lib/eve/eve-templates";
import { motion } from "motion/react";

export function PreviewExportPanel({ state }: { state: AgentState }) {
  const agentName = state.agentName || "agent";

  return (
    <div className="flex flex-col gap-5 h-full relative">
      <div className="rounded-xl border border-white/10 bg-black/50 p-5 font-mono text-[13px] text-neutral-300 shadow-inner">
        <div className="flex items-center gap-2 text-white font-medium">
          <Folder className="h-4 w-4 text-blue-400 fill-current" />
          <span>{agentName}/</span>
        </div>
        
        <div className="ml-4 mt-3 flex flex-col gap-3 border-l border-white/10 pl-4">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-yellow-400" />
            <span>agent.ts</span>
            {state.selectedTools.includes('firecrawl_mcp') && (
              <span className="ml-2 text-[10px] text-neutral-950">(MCP configured)</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-400" />
            <span>instructions.md</span>
          </div>

          <div className="flex flex-col gap-3">
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

          <div className="flex flex-col gap-3">
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

      <div className="mt-auto pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => generateEveZip(state)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 text-white px-5 py-3.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:bg-heat-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] transition-colors"
        >
          <Download className="h-4 w-4" />
          Download Agent (.zip)
        </motion.button>
      </div>
    </div>
  );
}
