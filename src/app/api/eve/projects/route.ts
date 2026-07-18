import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createEveProject, getEveProject, listEveProjects, saveEveProject } from "@/lib/eve/persistence";
import type { AgentProject } from "@/lib/eve/agent-project";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const id = new URL(request.url).searchParams.get("id");
    return NextResponse.json(id ? await getEveProject(id, user) : await listEveProjects(user));
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Project load failed." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { project: AgentProject };
    return NextResponse.json(await createEveProject(user, body.project), { status: 201 });
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Project creation failed." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { projectId: string; project: AgentProject };
    return NextResponse.json(await saveEveProject(body.projectId, user, body.project));
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Project save failed." }, { status: 400 });
  }
}
