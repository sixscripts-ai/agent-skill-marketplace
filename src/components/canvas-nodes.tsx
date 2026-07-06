import { Handle, Position, type NodeProps } from "@xyflow/react";

export function McpMounterNode({ data }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>🔌</span> MCP Mounter
        </div>
        <input 
          placeholder="Server ID (e.g. mcp-postgres)" 
          className="w-full text-xs font-mono p-1 border border-neutral-300 focus:border-neutral-900 outline-none"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
    </>
  );
}

export function LlmProcessorNode({ data }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>🧠</span> LLM Processor
        </div>
        <textarea 
          placeholder="System prompt / intent" 
          className="w-full h-16 text-xs font-mono p-1 border border-neutral-300 focus:border-neutral-900 outline-none resize-none"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
    </>
  );
}

export function TerminalExecutorNode({ data }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>&gt;_</span> Terminal Executor
        </div>
        <div className="text-[10px] text-neutral-500 font-mono bg-neutral-50 p-1 border border-neutral-200">
          Runs isolated in Firecracker MicroVM
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
    </>
  );
}

export function ConditionNode({ data }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>⑂</span> Conditional Edge
        </div>
        <input 
          placeholder="Expression (e.g. state.hasError)" 
          className="w-full text-xs font-mono p-1 border border-neutral-300 focus:border-neutral-900 outline-none"
        />
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} className="w-2 h-2 rounded-none bg-green-500 border-none" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} className="w-2 h-2 rounded-none bg-red-500 border-none" />
    </>
  );
}

export function ActionSubAgentNode({ data }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>⚙️</span> Action Sub-Agent
        </div>
        <select className="w-full text-xs font-mono p-1 border border-neutral-300 focus:border-neutral-900 outline-none">
          <option>Select SKILL.md node...</option>
          <option>Playwright Scraper</option>
          <option>Postgres Exec</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
    </>
  );
}
