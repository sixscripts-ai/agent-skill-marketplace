import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
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
    const body = await request.json() as { projectId: string; project: AgentProject & { fileMode?: string } };
    if (body.project.fileMode !== "explicit") return NextResponse.json(await saveEveProject(body.projectId, user, body.project));
    const owned = await prisma.eveProject.findFirst({ where: { id: body.projectId, ownerId: user.id }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: "Eve project not found or not owned by this user." }, { status: 404 });
    const files = Array.isArray(body.project.files) ? body.project.files.filter((file) => file?.path) : [];
    const paths = files.map((file) => file.path);
    await prisma.$transaction(async (tx) => {
      await tx.eveProject.update({ where: { id: body.projectId }, data: { name: body.project.metadata.displayName, description: body.project.metadata.description, config: body.project as unknown as Prisma.InputJsonValue } });
      await tx.eveProjectFile.deleteMany({ where: { projectId: body.projectId, ...(paths.length ? { path: { notIn: paths } } : {}) } });
      if (!paths.length) await tx.eveProjectFile.deleteMany({ where: { projectId: body.projectId } });
      for (const file of files) await tx.eveProjectFile.upsert({ where: { projectId_path: { projectId: body.projectId, path: file.path } }, create: { projectId: body.projectId, path: file.path, content: file.content, generated: file.generated !== false }, update: { content: file.content, generated: file.generated !== false, version: { increment: 1 } } });
    });
    return NextResponse.json(await getEveProject(body.projectId, user));
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Project save failed." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireCurrentUser();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Project identifier is required." }, { status: 400 });
    const result = await prisma.eveProject.deleteMany({ where: { id, ownerId: user.id } });
    if (!result.count) return NextResponse.json({ error: "Eve project not found or not owned by this user." }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Project deletion failed." }, { status: 400 });
  }
}
