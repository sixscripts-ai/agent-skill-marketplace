"use client";

import { EveLifecycleClient } from "@/components/eve-builder/eve-lifecycle-client";
import { AGENT_MODEL_OPTIONS } from "@/lib/eve/agent-project";

const mutableOptions = AGENT_MODEL_OPTIONS as unknown as Array<[string, string]>;
const grokIndex = mutableOptions.findIndex(([modelId]) => modelId.startsWith("xai/"));
if (grokIndex >= 0) mutableOptions[grokIndex] = ["xai/grok-4.5", "Grok 4.5"];
else mutableOptions.push(["xai/grok-4.5", "Grok 4.5"]);

for (const option of [
  ["deepseek/deepseek-v4-flash", "DeepSeek V4 Flash"],
  ["deepseek/deepseek-v4-pro", "DeepSeek V4 Pro"],
] as Array<[string, string]>) {
  if (!mutableOptions.some(([modelId]) => modelId === option[0])) mutableOptions.push(option);
}

export function EveLifecycleModelBridge() {
  return <EveLifecycleClient />;
}
