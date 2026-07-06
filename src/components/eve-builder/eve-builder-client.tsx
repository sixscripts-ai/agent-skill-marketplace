"use client";

import { useState } from "react";
import { Download, Settings, Layers, CodeXml } from "lucide-react";
import { MetadataPanel } from "./metadata-panel";
import { OrchestratorEditor } from "./orchestrator-editor";
import { CapabilitiesPanel } from "./capabilities-panel";
import { PreviewExportPanel } from "./preview-export-panel";
import { CanvasBuilder } from "./canvas-builder";
import { DEFAULT_INSTRUCTIONS_MD } from "@/lib/eve/eve-templates";
import { generateEveZip, type AgentState } from "@/lib/eve/export-utils";
import { motion } from "motion/react";

export function EveBuilderClient() {
  const [state, setState] = useState<AgentState>({
    agentName: "my-eve-agent",
    model: "anthropic/claude-3-5-sonnet-20240620",
    instructions: DEFAULT_INSTRUCTIONS_MD,
    selectedTools: [],
  });

  const [activeTab, setActiveTab] = useState<"canvas" | "instructions">("canvas");

  const updateState = (updates: Partial<AgentState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-background-base flex flex-col font-sans"
    >
      {/* Top Action Bar */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="fixed top-6 right-6 flex items-center gap-3 z-[60]"
      >
        <button
          className="px-4 py-2 bg-accent-white hover:bg-black-alpha-4 border border-border-faint rounded-lg text-sm text-accent-black transition-colors flex items-center gap-2 shadow-sm font-medium cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button
          onClick={() => generateEveZip(state)}
          className="px-5 py-2 bg-[#ccff00] hover:bg-[#b5e600] text-accent-black rounded-lg text-sm font-bold transition-all active:scale-[0.98] flex items-center gap-2 shadow-sm cursor-pointer border border-[#668000]/10"
        >
          <Download className="w-4 h-4 text-[#668000]" />
          Export Agent (.zip)
        </button>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Configuration */}
        <motion.aside
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-[320px] m-5 rounded-2xl border border-border-faint bg-accent-white p-6 shadow-lg flex-shrink-0 z-10 self-start max-h-[calc(100vh-40px)] overflow-y-auto scrollbar-hide space-y-8"
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-accent-black">
              Eve Agent Builder
            </h1>
            <p className="text-xs text-black-alpha-48 mt-1.5">Configure your agent's identity and tools.</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-[11px] font-bold text-black-alpha-64 uppercase tracking-wider">Identity</h2>
            <MetadataPanel state={state} updateState={updateState} />
          </section>

          <section className="space-y-4">
            <h2 className="text-[11px] font-bold text-black-alpha-64 uppercase tracking-wider">Active Checklist</h2>
            <CapabilitiesPanel state={state} updateState={updateState} />
          </section>
        </motion.aside>

        {/* Center Workspace (Canvas / Editor Toggle) */}
        <div className="flex-1 flex gap-5 p-5 pl-0 overflow-hidden relative z-0">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex-1 rounded-2xl border border-border-faint bg-accent-white shadow-lg overflow-hidden flex flex-col"
          >
            {/* Header with Switcher Tabs */}
            <div className="px-6 py-4 border-b border-border-faint bg-background-lighter flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-accent-black">
                  {activeTab === "canvas" ? "Visual Topology Canvas" : "instructions.md Core Brain"}
                </h2>
                <p className="text-xs text-black-alpha-48 mt-0.5">
                  {activeTab === "canvas" 
                    ? "Drag-and-drop tools and connect handles visually to attach skills." 
                    : "Write prompt, instructions, and define the custom core logic."}
                </p>
              </div>

              {/* High-fidelity custom toggle tabs */}
              <div className="flex bg-black-alpha-4 p-1 rounded-lg border border-border-faint">
                <button
                  onClick={() => setActiveTab("canvas")}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "canvas"
                      ? "bg-accent-white text-accent-black shadow-sm"
                      : "text-black-alpha-48 hover:text-accent-black"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Visual Canvas
                </button>
                <button
                  onClick={() => setActiveTab("instructions")}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "instructions"
                      ? "bg-accent-white text-accent-black shadow-sm"
                      : "text-black-alpha-48 hover:text-accent-black"
                  }`}
                >
                  <CodeXml className="w-3.5 h-3.5" />
                  Raw Instructions
                </button>
              </div>
            </div>

            {/* Active Workspace View */}
            <div className="flex-1 overflow-hidden relative">
              {activeTab === "canvas" ? (
                <CanvasBuilder state={state} updateState={updateState} />
              ) : (
                <div className="h-full overflow-y-auto p-6 scrollbar-hide bg-white">
                  <OrchestratorEditor state={state} updateState={updateState} />
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Preview Panel */}
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="w-[450px] shrink-0 rounded-2xl border border-border-faint bg-[#0a0a0a] shadow-lg overflow-hidden flex flex-col hidden xl:flex"
          >
            <div className="px-6 py-4 border-b border-white/10 bg-black/40">
              <h2 className="text-sm font-semibold text-white">Live Filesystem</h2>
              <p className="text-xs text-white/50 mt-0.5">Preview the generated Eve project code.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <PreviewExportPanel state={state} />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

