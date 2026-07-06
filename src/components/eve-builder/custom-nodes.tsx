"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Cpu, Terminal, Wrench, Globe, FileText, Settings, ShieldAlert } from "lucide-react";
import { AVAILABLE_TOOLS } from "@/lib/eve/eve-templates";

// 1. Agent Core Node (The central brain of the agent)
export function AgentCoreNode({ id, data }: NodeProps & { data: { agentName?: string; model?: string } }) {
  const modelName = data.model === "anthropic/claude-3-5-sonnet-20240620" 
    ? "Claude 3.5 Sonnet" 
    : data.model === "openai/gpt-4o" 
    ? "GPT-4o" 
    : data.model;

  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#111111] p-5 min-w-[260px] shadow-lg hover:shadow-xl transition-shadow duration-300 ring-1 ring-white/5">
      {/* Target handle for incoming Tools or MCP connections on the left */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="tools"
        className="!w-3 !h-3 !rounded-full !bg-neutral-950 text-white !border-2 !border-accent-black hover:!scale-125 transition-transform" 
      />

      {/* Node Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-3">
        <div className="p-2 rounded-xl bg-neutral-900 text-white/50 border border-white/10 text-white">
          <Cpu className="w-5 h-5 text-heat-100" />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Agent Core</h3>
          <p className="text-sm font-semibold text-white truncate max-w-[150px]">
            {data.agentName || "my-eve-agent"}
          </p>
        </div>
      </div>

      {/* Node Fields / Stats */}
      <div className="space-y-2.5">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-neutral-500 uppercase">LLM Engine</span>
          <span className="text-xs text-white font-medium">{modelName}</span>
        </div>
        
        <div className="flex items-center justify-between text-[11px] bg-black/50 px-2.5 py-1.5 rounded-lg border border-white/10">
          <span className="text-neutral-300 font-medium flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-neutral-500" />
            instructions.md
          </span>
          <span className="text-heat-100 font-bold text-[10px] bg-heat-100/10 px-1.5 py-0.5 rounded border border-heat-100/30">
            ACTIVE
          </span>
        </div>
      </div>

      {/* Source handle on the right for delegation or subagents if any */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="subagents"
        className="!w-3 !h-3 !rounded-full !bg-white/20 !border-2 !border-[#111] hover:!scale-125 transition-transform" 
      />
    </div>
  );
}

// 2. Tool Node (Represents local tools like Terminal execution or Evolve Skill)
export function ToolNode({ id, data }: NodeProps & { data: { toolId?: string; label?: string } }) {
  const toolDef = AVAILABLE_TOOLS.find(t => t.id === data.toolId);
  const isTerminal = data.toolId === "host_run_terminal";

  return (
    <div className="relative rounded-xl border border-white/10 bg-[#111111] p-4 min-w-[200px] max-w-[240px] shadow-sm hover:shadow-md transition-all duration-300 bg-linear-to-br from-[#111] to-black">
      <div className="flex items-start gap-2.5">
        <div className={`p-2 rounded-lg border ${isTerminal ? "bg-red-500/10 border-red-500/20 text-red-600" : "bg-blue-500/10 border-blue-500/20 text-blue-600"}`}>
          {isTerminal ? <Terminal className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white truncate">{toolDef?.name || data.label}</h4>
          <p className="text-[10px] text-neutral-400 leading-relaxed mt-1 line-clamp-2">
            {toolDef?.description}
          </p>
        </div>
      </div>

      {/* Right Source handle to connect into the Agent Core */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="connector"
        className="!w-3 !h-3 !rounded-full !bg-neutral-950 text-white !border-2 !border-accent-black hover:!scale-125 transition-transform" 
      />
    </div>
  );
}

// 3. MCP Node (Represents Firecrawl MCP or other remote server tools)
export function McpNode({ id, data }: NodeProps) {
  return (
    <div className="relative rounded-xl border border-white/10 bg-[#111111] p-4 min-w-[220px] max-w-[250px] shadow-sm hover:shadow-md transition-all duration-300 bg-linear-to-br from-[#111] to-[#ccff00]/5 ring-1 ring-white/5">
      <div className="flex items-start gap-2.5">
        <div className="p-2 rounded-lg bg-neutral-900 text-white/10 border border-white/10 text-white">
          <Globe className="w-4 h-4 text-heat-100" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-white truncate">Firecrawl MCP</h4>
            <span className="text-[8px] font-extrabold uppercase bg-neutral-800 text-neutral-300 px-1 py-0.5 rounded border border-white/10">
              MCP
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed mt-1">
            Web scraping & search capabilities. Injects Mendables live Firecrawl SDK.
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col gap-1">
        <span className="text-[8px] font-bold text-neutral-500 uppercase">FIRECRAWL_API_KEY</span>
        <div className="text-[10px] font-mono text-neutral-400 truncate bg-black/50 px-2 py-1 rounded border border-white/10">
          fc-ac7c037e102f45d6b39a...
        </div>
      </div>

      {/* Right Source handle to connect into the Agent Core */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="connector"
        className="!w-3 !h-3 !rounded-full !bg-neutral-950 text-white !border-2 !border-accent-black hover:!scale-125 transition-transform" 
      />
    </div>
  );
}
