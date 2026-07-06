import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";

export function McpMounterNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>🔌</span> MCP Mounter
        </div>
        <input
          value={String(data.serverId ?? "")}
          onChange={(e) => updateNodeData(id, { serverId: e.target.value })}
          placeholder="Server ID (e.g. mcp-postgres)"
          className="w-full text-xs font-mono p-1 border border-neutral-300 focus:border-neutral-900 outline-none"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
    </>
  );
}

export function LlmProcessorNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>🧠</span> LLM Processor
        </div>
        <textarea
          value={String(data.systemPrompt ?? "")}
          onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
          placeholder="System prompt / intent"
          className="w-full h-16 text-xs font-mono p-1 border border-neutral-300 focus:border-neutral-900 outline-none resize-none"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
    </>
  );
}

export function TerminalExecutorNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>&gt;_</span> Terminal Executor
        </div>
        <input
          value={String(data.command ?? "")}
          onChange={(e) => updateNodeData(id, { command: e.target.value })}
          placeholder="Command (e.g. npm test)"
          className="w-full text-xs font-mono p-1 border border-neutral-300 focus:border-neutral-900 outline-none"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
    </>
  );
}

export function ConditionNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>⑂</span> Conditional Edge
        </div>
        <input
          value={String(data.expression ?? "")}
          onChange={(e) => updateNodeData(id, { expression: e.target.value })}
          placeholder="Expression (e.g. state.hasError)"
          className="w-full text-xs font-mono p-1 border border-neutral-300 focus:border-neutral-900 outline-none"
        />
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} className="w-2 h-2 rounded-none bg-green-500 border-none" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} className="w-2 h-2 rounded-none bg-red-500 border-none" />
    </>
  );
}

export function ActionSubAgentNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <span>⚙️</span> Action Sub-Agent
        </div>
        <select
          value={String(data.selectedAgent ?? "")}
          onChange={(e) => updateNodeData(id, { selectedAgent: e.target.value })}
          className="w-full text-xs font-mono p-1 border border-neutral-300 focus:border-neutral-900 outline-none"
        >
          <option value="">Select SKILL.md node...</option>
          <option value="playwright-scraper">Playwright Scraper</option>
          <option value="postgres-exec">Postgres Exec</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-none bg-neutral-900 border-none" />
    </>
  );
}
