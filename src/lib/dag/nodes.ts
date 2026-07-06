import { Sandbox } from "@vercel/sandbox";
import { StateAnnotation } from "./schema";

export async function terminalExecutorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const command = state.payload.command;
  if (!command) {
    return { hasError: true, terminalOutput: "No command provided to terminal executor." };
  }

  // Spin up isolated Firecracker microVM
  const sandbox = await Sandbox.create();
  
  try {
    const running = await sandbox.runCommand({
      cmd: "bash",
      args: ["-lc", command],
      cwd: "/",
      detached: true,
    });

    let stdout = "";
    let stderr = "";
    for await (const log of running.logs()) {
      const chunk = log.data;
      if (log.stream === "stderr") stderr += chunk;
      else stdout += chunk;
    }

    const result = await running.wait();
    
    return { 
      terminalOutput: stdout || stderr || "",
      hasError: result.exitCode !== 0 
    };
  } catch (error) {
    return { hasError: true, terminalOutput: String(error) };
  }
}

export async function mcpMounterNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  // mcp-to-skill: Dynamically resolve and mount MCP tools into the node context
  const serverId = state.payload.mcpServerId;
  const currentSkills = new Set(state.activeMcpSkills);
  
  if (serverId) {
    console.log(`[mcp-to-skill] Dynamically mounting MCP Server: ${serverId}`);
    currentSkills.add(serverId);
    
    // In a real execution environment, we would also inject the tool schemas
    // into the Vercel AI SDK here before passing control to the llmProcessor.
  }
  
  return {
    activeMcpSkills: Array.from(currentSkills),
  };
}

export async function llmProcessorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  // Placeholder logic for the LLM processor
  // This would invoke the AI provider (e.g. via Vercel AI SDK)
  const prompt = state.payload.prompt;
  if (!prompt) {
    return { hasError: true };
  }

  return {
    payload: {
      ...state.payload,
      llmResponse: "Mocked LLM Response", // replace with actual ai() call
      requiresTerminal: prompt.includes("run:"),
      command: prompt.includes("run:") ? prompt.split("run:")[1]?.trim() : undefined,
    }
  };
}

export async function errorHandlerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  return {
    retryCount: state.retryCount + 1,
    hasError: false,
  };
}
