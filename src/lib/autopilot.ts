import { detectRunnableCommands } from "./run-state";
import { getProvider, getProviderRuntime } from "./providers";
import { streamLiveSandboxRun } from "./live-sandbox";
import { streamRealShellSandboxRun } from "./real-shell-sandbox";
import type {
  ExecutionMode,
  MarketplaceUser,
  SandboxProvider,
  Skill,
  SkillRun,
  SkillTraceEvent,
  WorkspaceFile,
} from "./types";

// ---------------------------------------------------------------------------
// Autopilot Plan — the "brain" that decides how to run a skill automatically
// ---------------------------------------------------------------------------

export interface AutopilotPlan {
  /** Which execution mode the autopilot chose */
  executionMode: "real-shell" | "virtual-agent";
  /** The shell command to run (only relevant for real-shell) */
  command: string;
  /** Auto-generated prompt sent to the sandbox */
  prompt: string;
  /** Which AI provider to use for virtual-agent mode */
  provider: SandboxProvider;
  /** Domains the sandbox is allowed to reach */
  networkAllowlist: string[];
  /** Human-readable explanation of why autopilot chose this config */
  reasoning: string;
}

/**
 * Analyze a skill and its workspace files to build an optimal execution plan.
 * Prefers real-shell when a runnable command is detected; falls back to virtual-agent.
 */
export function buildAutopilotPlan(
  skill: Skill,
  workspaceFiles: WorkspaceFile[] = [],
): AutopilotPlan {
  const commands = detectRunnableCommands(skill, workspaceFiles);
  const hasRunnableCommand = commands.length > 0;
  const bestCommand = commands[0] ?? "";

  // Pick the best available provider (prefer one with a live key)
  const providerPriority: SandboxProvider[] = ["groq", "openai", "gemini", "openrouter", "local"];
  let chosenProvider: SandboxProvider = "local";
  for (const id of providerPriority) {
    const p = getProvider(id);
    const rt = getProviderRuntime(p.id);
    if (rt.isLive) {
      chosenProvider = id;
      break;
    }
  }

  // Decide execution mode
  const executionMode: "real-shell" | "virtual-agent" = hasRunnableCommand ? "real-shell" : "virtual-agent";

  // Build a smart prompt based on skill context
  const prompt = buildSmartPrompt(skill, executionMode, bestCommand);

  // Default network allowlist for common package registries
  const networkAllowlist = ["registry.npmjs.org", "github.com"];

  // Build reasoning
  const reasoning = hasRunnableCommand
    ? `Detected runnable command "${bestCommand}" from skill packages. Using real-shell sandbox to execute it inside an isolated Vercel microVM.`
    : `No runnable commands detected in skill packages. Using virtual agent mode with ${chosenProvider} provider to generate a text-based response.`;

  return {
    executionMode,
    command: bestCommand,
    prompt,
    provider: chosenProvider,
    networkAllowlist,
    reasoning,
  };
}

/**
 * Generate an intelligent default prompt based on the skill's purpose.
 */
function buildSmartPrompt(
  skill: Skill,
  mode: "real-shell" | "virtual-agent",
  command: string,
): string {
  if (mode === "real-shell" && command) {
    return `Run "${skill.name}" against the uploaded package. Execute the approved command, capture all output, and produce a concise report with: (1) execution results, (2) any errors or warnings found, (3) actionable next steps.`;
  }

  return `Analyze "${skill.name}" and its workspace files. Inspect the skill definition, scripts, and examples. Produce a structured report covering: (1) what this skill does, (2) key risks or missing context, (3) suggested improvements or next steps.`;
}

// ---------------------------------------------------------------------------
// Autopilot Stream — delegates to the right sandbox after building a plan
// ---------------------------------------------------------------------------

export type AutopilotPayload =
  | { kind: "plan"; plan: AutopilotPlan }
  | { kind: "run"; run: SkillRun }
  | { kind: "event"; event: SkillTraceEvent }
  | { kind: "output"; output: string }
  | { kind: "complete"; run: SkillRun };

export async function* streamAutopilotRun(
  skill: Skill,
  owner: MarketplaceUser,
  workspaceFiles: WorkspaceFile[] = [],
): AsyncGenerator<AutopilotPayload> {
  const plan = buildAutopilotPlan(skill, workspaceFiles);

  // Emit the plan first so the UI can show what autopilot decided
  yield { kind: "plan", plan };

  if (plan.executionMode === "real-shell") {
    const stream = streamRealShellSandboxRun(skill, {
      owner,
      input: plan.prompt,
      command: plan.command,
      deniedPermissions: [], // autopilot auto-approves everything
      workspaceFiles,
      networkAllowlist: plan.networkAllowlist,
    });

    for await (const payload of stream) {
      yield payload as AutopilotPayload;
    }
  } else {
    const stream = streamLiveSandboxRun(
      skill,
      owner,
      plan.prompt,
      [], // no denied permissions — autopilot auto-approves
      plan.provider,
      workspaceFiles,
    );

    for await (const payload of stream) {
      yield payload as AutopilotPayload;
    }
  }
}
