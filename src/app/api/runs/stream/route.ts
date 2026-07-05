import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";
import { streamLiveSandboxRun } from "@/lib/live-sandbox";
import type { SandboxProvider, WorkspaceFile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    skillSlug?: string;
    input?: string;
    deniedPermissions?: string[];
    provider?: SandboxProvider;
    workspaceFiles?: WorkspaceFile[];
    replayOf?: string;
  };
  const user = await getCurrentUser();
  const skill = await findSkill(body.skillSlug ?? "agent-observer", user);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const payload of streamLiveSandboxRun(
        skill,
        body.input ?? "Run skill.",
        body.deniedPermissions ?? [],
        body.provider ?? "openai",
        body.workspaceFiles ?? [],
        body.replayOf,
      )) {
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
