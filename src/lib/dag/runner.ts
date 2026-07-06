import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentStateSchema, type AgentState } from "./schema";
import { PrismaCheckpointer } from "./checkpointer";
import { mcpMounterNode, llmProcessorNode, terminalExecutorNode, errorHandlerNode } from "./nodes";

// Instantiate the custom Prisma Checkpointer
export const checkpointer = new PrismaCheckpointer();

// Build the workflow graph
const workflow = new StateGraph<AgentState>({ channels: AgentStateSchema as any })
  .addNode("mcpMounter", mcpMounterNode as any)
  .addNode("llmProcessor", llmProcessorNode as any)
  .addNode("terminalExecutor", terminalExecutorNode as any)
  .addNode("errorHandler", errorHandlerNode as any)
  
  // Define strict deterministic routing
  .addEdge(START, "mcpMounter")
  .addConditionalEdges(
    "mcpMounter",
    (state: AgentState) => state.hasError ? "errorHandler" : "llmProcessor"
  )
  .addConditionalEdges(
    "llmProcessor",
    (state: AgentState) => state.payload.requiresTerminal ? "terminalExecutor" : END
  )
  .addConditionalEdges(
    "errorHandler",
    (state: AgentState) => state.retryCount < 3 ? "mcpMounter" : END
  )
  .addEdge("terminalExecutor", END);

// Compile the workflow into a runner, attaching the Checkpointer for async resumption
export const appRunner = workflow.compile({
  checkpointer,
});
