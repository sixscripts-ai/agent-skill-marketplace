"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  useReactFlow,
  ReactFlowProvider
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AgentCoreNode, ToolNode, McpNode } from "./custom-nodes";
import { AVAILABLE_TOOLS } from "@/lib/eve/eve-templates";
import type { AgentState } from "@/lib/eve/export-utils";
import { Sparkles, HelpCircle, Plus, Info } from "lucide-react";

const nodeTypes: NodeTypes = {
  agentCore: AgentCoreNode,
  toolNode: ToolNode,
  mcpNode: McpNode,
};

interface CanvasBuilderInnerProps {
  state: AgentState;
  updateState: (updates: Partial<AgentState>) => void;
}

function CanvasBuilderInner({ state, updateState }: CanvasBuilderInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const isSyncingFromProps = useRef(false);

  // 1. Initialize nodes & edges from parent state
  useEffect(() => {
    isSyncingFromProps.current = true;

    // Create the central Agent Core node
    const coreNode: Node = {
      id: "agent-core",
      type: "agentCore",
      position: { x: 380, y: 150 },
      data: { 
        agentName: state.agentName,
        model: state.model
      },
      deletable: false,
    };

    const newNodes: Node[] = [coreNode];
    const newEdges: Edge[] = [];

    // Render nodes and construct edges for selected tools
    state.selectedTools.forEach((toolId, index) => {
      const toolDef = AVAILABLE_TOOLS.find(t => t.id === toolId);
      const isMcp = toolDef?.isMcp ?? false;
      const nodeId = `node-${toolId}`;

      newNodes.push({
        id: nodeId,
        type: isMcp ? "mcpNode" : "toolNode",
        position: { x: 40, y: 50 + index * 140 },
        data: { toolId, label: toolDef?.name || toolId },
      });

      newEdges.push({
        id: `edge-${toolId}`,
        source: nodeId,
        target: "agent-core",
        targetHandle: "tools",
        sourceHandle: "connector",
        animated: true,
        style: { stroke: "#ccff00", strokeWidth: 2 },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);

    setTimeout(() => {
      isSyncingFromProps.current = false;
    }, 50);
  }, [state.agentName, state.model]); // Only sync when basic meta shifts, tool sync is down-flow

  // 2. Synchronize connected nodes back up to parent AgentState
  const syncToolsToParent = useCallback((currentEdges: Edge[]) => {
    if (isSyncingFromProps.current) return;
    
    // Find all tools with valid connections to the agent-core
    const connectedTools = currentEdges
      .filter(e => e.target === "agent-core" && e.source.startsWith("node-"))
      .map(e => e.source.replace("node-", ""));

    updateState({ selectedTools: connectedTools });
  }, [updateState]);

  // 3. Connect handler
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const updated = addEdge({ 
          ...params, 
          animated: true, 
          style: { stroke: "#ccff00", strokeWidth: 2 } 
        }, eds);
        syncToolsToParent(updated);
        return updated;
      });
    },
    [setEdges, syncToolsToParent],
  );

  // 4. Edges shift / deletion handler
  const onEdgesChangeInternal = useCallback((changes: any) => {
    onEdgesChange(changes);
    // Sync to parent after changes settle
    setTimeout(() => {
      setEdges((eds) => {
        syncToolsToParent(eds);
        return eds;
      });
    }, 20);
  }, [onEdgesChange, setEdges, syncToolsToParent]);

  // 5. Drag & Drop handlers
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const toolId = event.dataTransfer.getData("application/reactflow-tool");
      if (!toolId || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const toolDef = AVAILABLE_TOOLS.find(t => t.id === toolId);
      const isMcp = toolDef?.isMcp ?? false;
      const nodeId = `node-${toolId}`;

      // Prevent duplicate nodes on canvas
      setNodes((nds) => {
        if (nds.some(n => n.id === nodeId)) return nds;

        const newNode: Node = {
          id: nodeId,
          type: isMcp ? "mcpNode" : "toolNode",
          position,
          data: { toolId, label: toolDef?.name || toolId },
        };

        return nds.concat(newNode);
      });

      // Automatically draw a premium animated edge to agent-core to attach it instantly
      setTimeout(() => {
        setEdges((eds) => {
          if (eds.some(e => e.source === nodeId && e.target === "agent-core")) return eds;
          const newEdge: Edge = {
            id: `edge-${toolId}`,
            source: nodeId,
            target: "agent-core",
            targetHandle: "tools",
            sourceHandle: "connector",
            animated: true,
            style: { stroke: "#ccff00", strokeWidth: 2 },
          };
          const updated = eds.concat(newEdge);
          syncToolsToParent(updated);
          return updated;
        });
      }, 50);
    },
    [reactFlowInstance, setNodes, setEdges, syncToolsToParent],
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-background-lighter select-none">
      {/* Visual Workspace Canvas */}
      <div className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChangeInternal}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          className="bg-[#fcfcfc]"
        >
          {/* Dotted grid matching modern minimal builders */}
          <Background color="#eaeaea" gap={18} size={1} />
          
          <Controls className="!bg-accent-white !border !border-border-faint !shadow-sm !rounded-xl overflow-hidden p-1 flex gap-1 [&>button]:!border-none [&>button]:!bg-transparent [&>button]:hover:!bg-background-lighter [&>button]:!transition-colors [&>button]:!w-7 [&>button]:!h-7 [&>button]:!rounded-lg" />
          
          {/* Micro Legend */}
          <div className="absolute bottom-4 right-4 bg-accent-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-border-faint shadow-sm font-sans text-[10px] text-black-alpha-64 flex flex-col gap-1.5 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ccff00] border border-accent-black/20" />
              <span className="font-semibold">Connected / Active Capability</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-black-alpha-16" />
              <span>Drag & drop onto canvas to connect</span>
            </div>
          </div>
        </ReactFlow>
      </div>

      {/* Toolbox Panel (Draggable Capabilities) */}
      <aside className="w-[240px] border-l border-border-faint bg-accent-white p-5 flex flex-col h-full shrink-0 relative z-10 shadow-sm">
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-accent-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#668000]" />
            <span>Capability Deck</span>
          </div>
          <p className="text-[11px] text-black-alpha-48 mt-1">Drag elements onto the canvas to install them.</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
          {AVAILABLE_TOOLS.map((tool) => {
            const isInstalled = state.selectedTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/reactflow-tool", tool.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                className={`group cursor-grab active:cursor-grabbing rounded-xl border p-3.5 transition-all duration-300 relative overflow-hidden select-none bg-accent-white hover:shadow-md ${
                  isInstalled 
                    ? "border-[#ccff00] bg-[#f5ffcc]/10 shadow-[0_2px_12px_rgba(204,255,0,0.1)]" 
                    : "border-border-faint hover:border-border-muted"
                }`}
              >
                {/* Active Indicator bar */}
                {isInstalled && (
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#ccff00]" />
                )}

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent-black group-hover:text-black transition-colors truncate max-w-[120px]">
                      {tool.name}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-black-alpha-32 group-hover:text-accent-black transition-colors" />
                  </div>
                  <p className="text-[10px] text-black-alpha-48 leading-relaxed line-clamp-2 mt-1">
                    {tool.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-border-faint flex items-start gap-2 text-[10px] text-black-alpha-48">
          <Info className="w-3.5 h-3.5 shrink-0 text-black-alpha-32 mt-0.5" />
          <p className="leading-relaxed">Deleting a node from the canvas instantly uninstalls the tool from the compiled agent.</p>
        </div>
      </aside>
    </div>
  );
}

export function CanvasBuilder({ state, updateState }: CanvasBuilderInnerProps) {
  return (
    <ReactFlowProvider>
      <CanvasBuilderInner state={state} updateState={updateState} />
    </ReactFlowProvider>
  );
}
