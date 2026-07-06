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
    className: "border-neutral-900 rounded-none bg-white font-mono text-xs",
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

export function CanvasEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

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
        className: "border border-neutral-900 rounded-none bg-white font-mono text-xs p-3 min-w-[150px] shadow-[2px_2px_0_0_rgba(0,0,0,1)]",
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
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
    
    // In a real implementation this would save to the DB or download a file
    console.log("Exported DAG JSON:", JSON.stringify(dag, null, 2));
    alert("DAG Exported to Console!");
  }, [nodes, edges]);

  return (
    <div className="flex h-full w-full flex-row">
      {/* Sidebar for Drag and Drop Elements */}
      <aside className="w-64 border-r border-neutral-300 bg-neutral-50 p-4">
        <h3 className="mb-4 font-mono text-sm font-bold uppercase text-neutral-900">AI Elements</h3>
        <div className="flex flex-col gap-3">
          <div
            className="cursor-grab border border-neutral-900 bg-white p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", "mcpMounter");
              event.dataTransfer.effectAllowed = "move";
            }}
            draggable
          >
            🔌 MCP Mounter
          </div>
          <div
            className="cursor-grab border border-neutral-900 bg-white p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", "llmProcessor");
              event.dataTransfer.effectAllowed = "move";
            }}
            draggable
          >
            🧠 LLM Processor
          </div>
          <div
            className="cursor-grab border border-neutral-900 bg-white p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", "terminalExecutor");
              event.dataTransfer.effectAllowed = "move";
            }}
            draggable
          >
            &gt;_ Terminal Executor
          </div>
          <div
            className="cursor-grab border border-neutral-900 bg-white p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", "conditionNode");
              event.dataTransfer.effectAllowed = "move";
            }}
            draggable
          >
            ⑂ Conditional Edge
          </div>
          <div
            className="cursor-grab border border-neutral-900 bg-white p-3 font-mono text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
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
          nodeTypes={nodeTypes}
          fitView
          className="bg-neutral-100"
        >
          <Background color="#d4d4d4" gap={16} />
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
    </div>
  );
}
