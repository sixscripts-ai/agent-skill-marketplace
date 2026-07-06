"use server";

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function generateCopilotRefinement(prompt: string, currentInstructions: string) {
  const { text } = await generateText({
    model: openai('gpt-4o'),
    system: `You are an AI assistant helping a developer write instructions for their autonomous AI agent.
The agent uses the "Eve" filesystem-first framework.
Your task is to take the user's request, look at the current agent instructions, and output the NEW, FULL, REFINED instructions in markdown.
DO NOT include any commentary, just the final markdown file content. Do not wrap the output in markdown code blocks (\`\`\`).
Current Instructions:
${currentInstructions}`,
    prompt: prompt,
  });

  return text;
}
