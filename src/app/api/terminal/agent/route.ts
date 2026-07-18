import { convertToModelMessages, isStepCount, streamText, tool } from "ai";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { assertSafeCommand, isDestructiveCommand, terminalLimits } from "@/lib/terminal-guardrails";
import { DEFAULT_TERMINAL_MODEL, resolveTerminalModel, resolveTerminalModelId } from "@/lib/terminal-models";
import {
  assertTerminalSandboxReady,
  execInTerminalSandbox,
  readTerminalFile,
  writeTerminalFile,
} from "@/lib/terminal-session";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const ready = assertTerminalSandboxReady();
    if (!ready.ok) return Response.json(ready.body, { status: ready.status });

    await requireCurrentUser();
    const body = await request.json();
    const sandboxName = typeof body.sandboxName === "string" ? body.sandboxName.trim() : "";
    const messages = Array.isArray(body.messages) ? body.messages : null;
    const confirmDestructive = Boolean(body.confirmDestructive);
    const modelId = resolveTerminalModelId(typeof body.model === "string" ? body.model : DEFAULT_TERMINAL_MODEL);
    const maxSteps = Math.min(
      Math.max(Number(body.maxSteps) || terminalLimits.defaultMaxSteps, 1),
      terminalLimits.defaultMaxSteps,
    );

    if (!sandboxName) {
      return Response.json(
        { error: true, code: "MISSING_SANDBOX", message: "sandboxName is required. Connect a terminal session first." },
        { status: 400 },
      );
    }
    if (!messages) {
      return Response.json({ error: true, code: "MISSING_MESSAGES", message: "messages array is required." }, { status: 400 });
    }

    let apiKeys: Record<string, string> = {};
    try {
      apiKeys = JSON.parse(request.headers.get("x-api-keys") || "{}");
    } catch {
      return Response.json(
        { error: true, code: "INVALID_API_KEYS", message: "Stored API keys are invalid." },
        { status: 400 },
      );
    }

    const resolved = resolveTerminalModel(modelId, apiKeys);
    if ("error" in resolved) {
      return Response.json(resolved.error, { status: 400 });
    }

    const result = streamText({
      model: resolved.model,
      system: `You are a terminal agent operating inside an isolated Vercel Sandbox for skill package work.
Rules:
- Prefer run_shell for commands. Use write_file / read_file for file edits.
- Working directory defaults to /vercel/sandbox.
- Be concise. Explain what you run before or after tool calls.
- Never invent command output — only report tool results.
- Destructive operations require user confirmation (confirmDestructive).
- Network is deny-all unless the session was created with an allowlist.
- Stop when the user goal is met. Max tool rounds: ${maxSteps}.
Current model: ${modelId}.`,
      messages: await convertToModelMessages(messages),
      stopWhen: isStepCount(maxSteps),
      tools: {
        run_shell: tool({
          description: "Run a bash command in the shared sandbox and return stdout/stderr.",
          inputSchema: z.object({
            command: z.string().min(1).max(terminalLimits.maxCommandChars),
            cwd: z.string().optional(),
          }),
          execute: async ({ command, cwd }) => {
            if (isDestructiveCommand(command) && !confirmDestructive) {
              return {
                ok: false,
                code: "DESTRUCTIVE_CONFIRM_REQUIRED",
                message: "Destructive command blocked until the user confirms.",
                command,
              };
            }
            const safe = assertSafeCommand(command, { allowDestructive: confirmDestructive });
            if (!safe.ok) {
              return { ok: false, code: safe.code, message: safe.message, command };
            }
            const exec = await execInTerminalSandbox({ sandboxName, command: safe.command, cwd });
            return {
              ok: exec.exitCode === 0,
              exitCode: exec.exitCode,
              output: exec.output,
              command: safe.command,
            };
          },
        }),
        write_file: tool({
          description: "Write a text file into the sandbox filesystem.",
          inputSchema: z.object({
            path: z.string().min(1),
            content: z.string(),
          }),
          execute: async ({ path, content }) => {
            const written = await writeTerminalFile({ sandboxName, path, content });
            return { ok: true, ...written };
          },
        }),
        read_file: tool({
          description: "Read a text file from the sandbox filesystem.",
          inputSchema: z.object({
            path: z.string().min(1),
          }),
          execute: async ({ path }) => {
            const file = await readTerminalFile({ sandboxName, path });
            return { ok: true, ...file };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => (error instanceof Error ? error.message : "Terminal agent failed."),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terminal agent failed.";
    return Response.json({ error: true, code: "AGENT_FAILED", message }, { status: 500 });
  }
}
