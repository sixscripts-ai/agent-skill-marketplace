import { z } from "zod";
import { Annotation } from "@langchain/langgraph";

export const AgentStateSchema = z.object({
  executionId: z.string().uuid(),
  currentNode: z.string().default("START"),
  payload: z.record(z.string(), z.any()).default({}), // Working memory / data from previous nodes
  activeMcpSkills: z.array(z.string()).default([]), // Dynamically mounted mcp-to-skill tools
  terminalOutput: z.string().nullable().default(null),
  hasError: z.boolean().default(false),
  retryCount: z.number().default(0),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

export const StateAnnotation = Annotation.Root({
  executionId: Annotation<string>,
  currentNode: Annotation<string>,
  payload: Annotation<Record<string, any>>,
  activeMcpSkills: Annotation<string[]>,
  terminalOutput: Annotation<string | null>,
  hasError: Annotation<boolean>,
  retryCount: Annotation<number>,
});
