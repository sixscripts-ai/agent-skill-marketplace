"use server";

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';

export async function generateCopilotRefinement(
  prompt: string, 
  currentInstructions: string,
  modelId: string = "google/gemini-2.5-pro",
  apiKeys: Record<string, string> = {}
) {
  let aiModel;
  
  if (modelId.startsWith("anthropic/")) {
    const anthropic = createAnthropic({ apiKey: apiKeys.anthropic || process.env.ANTHROPIC_API_KEY || "" });
    aiModel = anthropic(modelId.replace("anthropic/", ""));
  } else if (modelId.startsWith("google/")) {
    const google = createGoogleGenerativeAI({ apiKey: apiKeys.google || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "" });
    aiModel = google(modelId.replace("google/", ""));
  } else if (modelId.startsWith("xai/")) {
    const xai = createXai({ apiKey: apiKeys.xai || process.env.XAI_API_KEY || "" });
    aiModel = xai(modelId.replace("xai/", ""));
  } else {
    // Default to OpenAI
    const openai = createOpenAI({ apiKey: apiKeys.openai || process.env.OPENAI_API_KEY || "" });
    aiModel = openai(modelId.replace("openai/", ""));
  }

  const { text } = await generateText({
    model: aiModel,
    system: `You are an AI assistant helping a developer write the instructions.md file for their autonomous AI agent.
The agent uses the "Eve" filesystem-first framework.
Your task is to take the user's request, look at the current agent instructions, and output the NEW, FULL, REFINED instructions.md file in markdown.

CRITICAL RULES:
1. YOU ARE WRITING INSTRUCTIONS FOR AN AI AGENT. YOU ARE NOT WRITING THE ACTUAL APP CODE.
2. If the user asks to "make an app", your output should be instructions telling the AGENT how to build the app (e.g. "Your goal is to build an app. Follow these steps: 1. Set up Next.js...").
3. DO NOT output source code (React, Python, HTML) unless it is a small snippet meant to be part of the agent's instructions.
4. DO NOT include any commentary, just the final markdown file content.
5. Do not wrap the output in markdown code blocks (\`\`\`).

Current Instructions:
${currentInstructions}`,
    prompt: prompt,
  });

  return text;
}
