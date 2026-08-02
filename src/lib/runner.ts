import type { AutopilotPlan } from "./autopilot";
import type { ExecutionMode, SandboxProvider, SkillDraftInput, SkillRun, SkillTraceEvent, WorkspaceFile } from "./types";

export type RunStreamPayload =
  | { kind: "plan"; plan: AutopilotPlan }
  | { kind: "run"; run: SkillRun }
  | { kind: "event"; event: SkillTraceEvent }
  | { kind: "output"; output: string }
  | { kind: "complete"; run: SkillRun };

export interface ExecuteSkillRunOptions {
  skillSlug: string;
  draftSkill?: SkillDraftInput;
  input: string;
  deniedPermissions?: string[];
  provider?: SandboxProvider;
  executionMode?: ExecutionMode;
  command?: string;
  networkAllowlist?: string[];
  workspaceFiles?: WorkspaceFile[];
  replayOf?: string;
  onRun?: (run: SkillRun) => void;
  onPlan?: (plan: AutopilotPlan) => void;
  onEvent?: (event: SkillTraceEvent) => void;
  onOutput?: (output: string) => void;
  onError?: (error: string) => void;
  onComplete?: (run: SkillRun) => void;
}

export async function executeSkillRunStream(options: ExecuteSkillRunOptions): Promise<void> {
  const {
    skillSlug,
    draftSkill,
    input,
    deniedPermissions = [],
    provider = "openai",
    executionMode = "virtual-agent",
    command = "",
    networkAllowlist = [],
    workspaceFiles = [],
    replayOf,
  } = options;

  try {
    const response = await fetch("/api/runs/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        skillSlug,
        draftSkill,
        input,
        deniedPermissions,
        provider,
        executionMode,
        command,
        networkAllowlist,
        workspaceFiles,
        replayOf,
      }),
    });

    if (!response.ok || !response.body) {
      const message = await response.text().catch(() => "Run stream failed to start. No run was created.");
      options.onError?.(message || "Run stream failed to start. No run was created.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.split("\n").find((item) => item.startsWith("data: "));
        if (!line) continue;
        const payload = JSON.parse(line.slice(6)) as RunStreamPayload;
        if (payload.kind === "plan") {
          options.onPlan?.(payload.plan);
        } else if (payload.kind === "run") {
          options.onRun?.(payload.run);
        } else if (payload.kind === "event") {
          options.onEvent?.(payload.event);
        } else if (payload.kind === "output") {
          options.onOutput?.(payload.output);
        } else if (payload.kind === "complete") {
          options.onComplete?.(payload.run);
        }
      }
    }
  } catch (error) {
    options.onError?.(error instanceof Error ? error.message : String(error));
  }
}
