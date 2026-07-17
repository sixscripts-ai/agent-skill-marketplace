import { StateGraph, START, END } from "@langchain/langgraph";
import { StateAnnotation, type AgentState } from "./schema";
import { PrismaCheckpointer } from "./checkpointer";
import { mcpMounterNode, llmProcessorNode, terminalExecutorNode, errorHandlerNode } from "./nodes";

// Instantiate the custom Prisma Checkpointer
export const checkpointer = new PrismaCheckpointer();

// Build the workflow graph
const workflow = new StateGraph(StateAnnotation)
  .addNode("mcpMounter", mcpMounterNode)
  .addNode("llmProcessor", llmProcessorNode)
  .addNode("terminalExecutor", terminalExecutorNode)
  .addNode("errorHandler", errorHandlerNode)
  
  // Define strict deterministic routing
  .addEdge(START, "mcpMounter")
  .addConditionalEdges(
    "mcpMounter",
    (state: typeof StateAnnotation.State) => state.hasError ? "errorHandler" : "llmProcessor"
  )
  .addConditionalEdges(
    "llmProcessor",
    (state: typeof StateAnnotation.State) => state.payload.requiresTerminal ? "terminalExecutor" : END
  )
  .addConditionalEdges(
    "errorHandler",
    (state: typeof StateAnnotation.State) => state.retryCount < 3 ? "mcpMounter" : END
  )
  .addEdge("terminalExecutor", END);

// Compile the workflow into a runner, attaching the Checkpointer for async resumption
export const appRunner = workflow.compile({
  checkpointer,
});
