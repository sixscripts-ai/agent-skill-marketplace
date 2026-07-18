import { requireCurrentUser } from "@/lib/auth";
import {
  assertTerminalSandboxReady,
  createTerminalSandbox,
  stopTerminalSandbox,
} from "@/lib/terminal-session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const ready = assertTerminalSandboxReady();
    if (!ready.ok) return Response.json(ready.body, { status: ready.status });

    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      skillSlug?: string;
    };
    const skillSlug = typeof body.skillSlug === "string" && body.skillSlug.trim() ? body.skillSlug.trim() : "";
    if (!skillSlug) {
      return Response.json(
        { error: true, code: "MISSING_SKILL", message: "skillSlug is required.", suggestion: "Pass a skill package slug." },
        { status: 400 },
      );
    }

    const session = await createTerminalSandbox({
      owner: user,
      skillSlug,
    });

    return Response.json({
      sandboxName: session.info.sandboxName,
      skillSlug: session.info.skillSlug,
      createdAt: session.info.createdAt,
      mountedFiles: session.mountedFiles,
      wsUrl: session.interactive.url,
      token: session.interactive.token,
      cols: 100,
      rows: 32,
      readiness: ready.readiness,
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : 500;
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "SESSION_CREATE_FAILED";
    const message = error instanceof Error ? error.message : "Failed to create terminal session.";
    return Response.json({ error: true, code, message, suggestion: "Check sandbox auth and ENABLE_REAL_SANDBOX." }, { status: status || 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as { sandboxName?: string };
    const sandboxName = typeof body.sandboxName === "string" ? body.sandboxName.trim() : "";
    if (!sandboxName) {
      return Response.json(
        { error: true, code: "MISSING_SANDBOX", message: "sandboxName is required." },
        { status: 400 },
      );
    }
    await stopTerminalSandbox(sandboxName);
    return Response.json({ ok: true, sandboxName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stop terminal session.";
    return Response.json({ error: true, code: "SESSION_STOP_FAILED", message }, { status: 500 });
  }
}
