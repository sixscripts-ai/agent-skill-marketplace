import { requireCurrentUser } from "@/lib/auth";
import { assertSafeCommand } from "@/lib/terminal-guardrails";
import { assertTerminalSandboxReady, execInTerminalSandbox } from "@/lib/terminal-session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const ready = assertTerminalSandboxReady();
    if (!ready.ok) return Response.json(ready.body, { status: ready.status });

    await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      sandboxName?: string;
      command?: string;
      cwd?: string;
      confirmDestructive?: boolean;
    };

    const sandboxName = typeof body.sandboxName === "string" ? body.sandboxName.trim() : "";
    if (!sandboxName) {
      return Response.json(
        { error: true, code: "MISSING_SANDBOX", message: "sandboxName is required." },
        { status: 400 },
      );
    }

    const safe = assertSafeCommand(typeof body.command === "string" ? body.command : "", {
      allowDestructive: Boolean(body.confirmDestructive),
    });
    if (!safe.ok) {
      return Response.json(
        {
          error: true,
          code: safe.code,
          message: safe.message,
          suggestion: "suggestion" in safe ? safe.suggestion : "Provide a shorter safe command.",
        },
        { status: 400 },
      );
    }

    const result = await execInTerminalSandbox({
      sandboxName,
      command: safe.command,
      cwd: typeof body.cwd === "string" ? body.cwd : undefined,
    });

    return Response.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      output: result.output,
      command: safe.command,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command execution failed.";
    return Response.json(
      { error: true, code: "EXEC_FAILED", message, suggestion: "Reconnect the terminal session and retry." },
      { status: 500 },
    );
  }
}
