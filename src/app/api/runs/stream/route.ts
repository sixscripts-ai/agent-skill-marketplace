import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { findSkill } from "@/lib/repository";
import { streamLiveSandboxRun } from "@/lib/live-sandbox";
import { streamRealShellSandboxRun } from "@/lib/real-shell-sandbox";
import { normalizeNetworkAllowlist } from "@/lib/sandbox-security";
import type { ExecutionMode, SandboxProvider, WorkspaceFile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
  const body = (await request.json()) as {
    skillSlug?: string;
    input?: string;
    deniedPermissions?: string[];
    provider?: SandboxProvider;
    executionMode?: ExecutionMode;
    command?: string;
    networkAllowlist?: string[];
    workspaceFiles?: WorkspaceFile[];
    replayOf?: string;
  };
  let networkAllowlist: string[] = [];
  try {
    networkAllowlist = normalizeNetworkAllowlist(body.networkAllowlist ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid network allowlist." },
      { status: 400 },
    );
  }

  const skill = await findSkill(body.skillSlug ?? "agent-observer", user);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const payloads =
        body.executionMode === "real-shell"
          ? streamRealShellSandboxRun(skill, {
              owner: user,
              input: body.input ?? "Run skill.",
              deniedPermissions: body.deniedPermissions ?? [],
              workspaceFiles: body.workspaceFiles ?? [],
              command: body.command,
              networkAllowlist,
              replayOf: body.replayOf,
            })
          : streamLiveSandboxRun(
              skill,
              user,
              body.input ?? "Run skill.",
              body.deniedPermissions ?? [],
              body.provider ?? "openai",
              body.workspaceFiles ?? [],
              body.replayOf,
            );
      for await (const payload of payloads) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
