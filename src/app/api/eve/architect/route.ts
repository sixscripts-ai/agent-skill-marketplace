import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { getEveProject, saveEveProject, updateEveRun } from "@/lib/eve/persistence";
import { mergeArchitectProject, type AgentProject } from "@/lib/eve/agent-project";

export const maxDuration = 60;

type ArchitectMessage = { role: "user" | "assistant"; content: string };
type ArchitectResult =
  | { status: "clarify"; message: string; questions: string[]; plan: string[] }
  | { status: "update"; update: Partial<AgentProject>; plan: string[]; complete: boolean; continuation