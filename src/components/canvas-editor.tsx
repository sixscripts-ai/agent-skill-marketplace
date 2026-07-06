"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  McpMounterNode,
  LlmProcessorNode,
  TerminalExecutorNode,
  ConditionNode,
  ActionSubAgentNode,
} from "./canvas-nodes";

const initialNodes: Node[] = [
  {
    id: "start",
    type: "input",
    data: { label: "Trigger (START)" },
    position: { x: 250, y: 25 },
    className: "border-neutral-900 rounded-none bg-[#39FF14] font-mono text-xs",
  },
];

const initialEdges: Edge[] = [];

const nodeTypes: NodeTypes = {
  mcpMounter: McpMounterNode,
  llmProcessor: LlmProcessorNode,
  terminalExecutor: TerminalExecutorNode,
  conditionNode: ConditionNode,
  actionSubAgent: ActionSubAgentNode,
};

const nodeTypeLabels: Record<string, { label: string; fields: { key: string; label: string; type: "text" | "textarea" | "select"; options?: { value: string; label: string }[] }[] }> = {
  mcpMounter: {
    label: "🔌 MCP Mounter",
    fields: [
      { key: "serverId", label: "Server ID", type: "text" },
      { key: "transport", label: "Transport", type: "select", options: [{ value: "stdio", label: "stdio" }, { value: "http-sse", label: "HTTP SSE" }, { value: "websocket", label: "WebSocket" }] },
    ],
  },
  llmProcessor: {
    label: "🧠 LLM Processor",
    fields: [
      { key: "systemPrompt", label: "System Prompt", type: "textarea" },
      { key: "model", label: "Model", type: "text" },
    ],
  },
  terminalExecutor: {
    label: ">_ Terminal Executor",
    fields: [
      { key: "command", label: "Command", type: "text" },
    ],
  },
  conditionNode: {
    label: "⑂ Conditional Edge",
    fields: [
      { key: "expression", label: "Expression", type: "text" },
    ],
  },
  actionSubAgent: {
    label: "⚙️ Action Sub-Agent",
    fields: [
      { key: "selectedAgent", label: "Sub-Agent", type: "select", options: [{ value: "playwright-scraper", label: "Playwright Scraper" }, { value: "postgres-exec", label: "Postgres Exec" }] },
    ],
  },
};

export function CanvasEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
        className: "border border-neutral-900 rounded-none bg-[#39FF14] font-mono text-xs p-3 min-w-[150px] shadow-[2px_2px_0_0_rgba(0,0,0,1)]",
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeField = useCallback(
    (nodeId: string, key: string, value: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n,
        ),
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, [key]: value } } : prev,
      );
    },
    [setNodes],
  );

  const exportDag = useCallback(() => {
    const dag = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        data: n.data,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
      })),
    };
    
    const blob = new Blob([JSON.stringify(dag, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dag-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  return (
    <div className="flex h-full w-full flex-row">
      {/* Sidebar for Drag and Drop Elements */}
      <aside className="w-64 border-r border-neutral-300 bg-neutral-50 p-4">
        <h3 className="mb-4 font-mono text-sm font-bold uppercase text-neutral-900">AI Elements</h3>
        <div className="flex flex-col gap-3">
          <div
            className="cursor-grab border border-neutral-900 bg-[#39FF14] p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", "mcpMounter");
              event.dataTransfer.effectAllowed = "move";
            }}
            draggable
          >
            🔌 MCP Mounter
          </div>
          <div
            className="cursor-grab border border-neutral-900 bg-[#39FF14] p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", "llmProcessor");
              event.dataTransfer.effectAllowed = "move";
            }}
            draggable
          >
            🧠 LLM Processor
          </div>
          <div
            className="cursor-grab border border-neutral-900 bg-[#39FF14] p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", "terminalExecutor");
              event.dataTransfer.effectAllowed = "move";
            }}
            draggable
          >
            &gt;_ Terminal Executor
          </div>
          <div
            className="cursor-grab border border-neutral-900 bg-[#39FF14] p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", "conditionNode");
              event.dataTransfer.effectAllowed = "move";
            }}
            draggable
          >
            ⑂ Conditional Edge
          </div>
          <div
            className="cursor-grab border border-neutral-900 bg-[#39FF14] p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", "actionSubAgent");
              event.dataTransfer.effectAllowed = "move";
            }}
            draggable
          >
            ⚙️ Action Sub-Agent
          </div>
        </div>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1" style={{ height: "600px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
          className="bg-neutral-950"
        >
          <Background color="#333" gap={16} />
          <Controls className="rounded-none border border-neutral-900 shadow-[2px_2px_0_0_rgba(0,0,0,1)]" />
          <MiniMap className="rounded-none border border-neutral-900" nodeColor="#0a0a0a" maskColor="rgba(240, 240, 240, 0.6)" />
          
          <Panel position="top-right">
            <button 
              onClick={exportDag}
              className="rounded-none border border-neutral-900 bg-neutral-900 px-4 py-2 font-mono text-sm font-bold text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            >
              Export DAG (.json)
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Node Property Panel */}
      {selectedNode && selectedNode.type && nodeTypeLabels[selectedNode.type] ? (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={closePanel} />
          <div className="fixed top-0 right-0 bottom-0 w-[380px] bg-[#39FF14] border-l border-neutral-200 z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.08)] flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-950">{nodeTypeLabels[selectedNode.type].label}</h3>
              <button onClick={closePanel} className="grid size-7 place-items-center rounded-md border border-neutral-200 bg-[#39FF14] text-sm text-neutral-500 hover:bg-neutral-100" type="button">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {nodeTypeLabels[selectedNode.type].fields.map((field) => (
                <label key={field.key} className="block text-sm font-medium text-neutral-700">
                  {field.label}
                  {field.type === "textarea" ? (
                    <textarea
                      value={String(selectedNode.data[field.key] ?? "")}
                      onChange={(e) => updateNodeField(selectedNode.id, field.key, e.target.value)}
                      className="mt-2 w-full h-24 rounded-md border border-neutral-200 p-3 font-mono text-xs outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 resize-none"
                    />
                  ) : field.type === "select" && field.options ? (
                    <select
                      value={String(selectedNode.data[field.key] ?? "")}
                      onChange={(e) => updateNodeField(selectedNode.id, field.key, e.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                    >
                      <option value="">Select...</option>
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={String(selectedNode.data[field.key] ?? "")}
                      onChange={(e) => updateNodeField(selectedNode.id, field.key, e.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-neutral-200 px-3 font-mono text-xs outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                    />
                  )}
                </label>
              ))}
              <div className="pt-4 border-t border-neutral-200">
                <button
                  onClick={closePanel}
                  className="w-full h-10 rounded-md bg-neutral-950 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  type="button"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
