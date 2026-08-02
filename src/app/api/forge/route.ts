import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { runForgeLoop, type ForgeLoopInput } from "@/lib/marketplace-forge";

export const runtime = "nodejs";
export const maxDuration = 120;

type ForgeRequestBody = {
  goal?: string;
  packageId?: string;
  skillMarkdown?: string;
  skillName?: string;
  slug?: string;
  files?: Array<{ path: string; content: string }>;
  continuation?: string;
  confirmDestructive?: boolean;
  approvePublic?: boolean;
  userApprovedHighRisk?: boolean;
  visibility?: "public" | "private" | "unlisted";
  batch?: number;
  maxSteps?: number;
  maxBatches?: number;
};

export async function POST(request: Request) {
  const requestId = `forge_${Date.now().toString(36)}`;
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: "Authentication required.", requestId }, { status: 401 });
  }

  let body: ForgeRequestBody;
  try {
    body = (await request.json()) as ForgeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", requestId }, { status: 400 });
  }

  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  if (!goal) {
    return NextResponse.json({ error: "goal is required.", requestId }, { status: 400 });
  }

  const input: ForgeLoopInput = {
    goal,
    user,
    packageId: typeof body.packageId === "string" ? body.packageId : undefined,
    skillMarkdown: typeof body.skillMarkdown === "string" ? body.skillMarkdown : undefined,
    skillName: typeof body.skillName === "string" ? body.skillName : undefined,
    slug: typeof body.slug === "string" ? body.slug : undefined,
    files: Array.isArray(body.files) ? body.files : undefined,
    continuation: typeof body.continuation === "string" ? body.continuation : undefined,
    confirmDestructive: Boolean(body.confirmDestructive),
    approvePublic: Boolean(body.approvePublic),
    userApprovedHighRisk: Boolean(body.userApprovedHighRisk),
    visibility: body.visibility === "public" || body.visibility === "unlisted" || body.visibility === "private" ? body.visibility : undefined,
    batch: typeof body.batch === "number" ? body.batch : undefined,
    maxSteps: typeof body.maxSteps === "number" ? body.maxSteps : undefined,
    maxBatches: typeof body.maxBatches === "number" ? body.maxBatches : undefined,
  };

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of runForgeLoop(input)) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "message",
              role: "assistant",
              content: error instanceof Error ? `${error.message} (requestId=${requestId})` : `Forge loop failed (requestId=${requestId}).`,
            })}\n`,
          ),
        );
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "complete",
              evidenceIds: [],
              metrics: { steps: 0, toolCounts: {}, latencyMs: 0, evidenceOk: 0, hitlCount: 0 },
            })}\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-request-id": requestId,
    },
  });
}
