import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { findRun } from "@/lib/repository";
import { createZip } from "@/lib/zip";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
  const { runId } = await params;
  const run = await findRun(runId, user);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const manifest = {
    runId: run.id,
    skill: run.skillName,
    version: run.version,
    status: run.status,
    provider: run.provider,
    model: run.model,
    createdAt: run.createdAt,
    input: run.input,
    workspaceFiles: run.workspaceFiles?.map((file) => file.path) ?? [],
    artifacts: run.artifacts?.map((artifact) => artifact.path) ?? [],
  };

  const zip = createZip([
    { path: "run-manifest.json", content: JSON.stringify(manifest, null, 2) },
    { path: "trace.json", content: JSON.stringify(run, null, 2) },
    ...(run.workspaceFiles ?? []).map((file) => ({
      path: `workspace/${safeZipPath(file.path)}`,
      content: file.content,
    })),
    ...(run.artifacts ?? []).map((artifact) => ({
      path: `artifacts/${safeZipPath(artifact.path)}`,
      content: artifact.after,
    })),
  ]);

  return new Response(zip, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${run.id}-workspace.zip"`,
    },
  });
}

function safeZipPath(value: string) {
  return value
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}
