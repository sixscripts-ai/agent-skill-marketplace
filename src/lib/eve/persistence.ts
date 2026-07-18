import type { Prisma } from "@prisma/client";
import { AuthorizationError } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import type { MarketplaceUser } from "@/lib/types";
import type { AgentProject } from "./agent-project";

export async function listEveProjects(user: MarketplaceUser) {
  return prisma.eveProject.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, slug: true, status: true, updatedAt: true } });
}

export async function createEveProject(user: MarketplaceUser, project: AgentProject) {
  await prisma.user.upsert({ where: { id: user.id }, create: { id: user.id, clerkId: user.clerkId, name: user.name, email: user.email, role: user.role }, update: { clerkId: user.clerkId, name: user.name, email: user.email, role: user.role } });
  const row = await prisma.eveProject.create({ data: { ownerId: user.id, name: project.metadata.displayName, slug: slug(project.metadata.directoryName), description: project.metadata.description, config: project as unknown as Prisma.InputJsonValue, conversations: { create: { title: project.metadata.displayName } }, files: { create: project.files.map((file) => ({ path: file.path, content: file.content, generated: file.generated !== false })) } }, include: { conversations: { take: 1 }, files: true } });
  return stored(row);
}

export async function getEveProject(projectId: string, user: MarketplaceUser) {
  const row = await prisma.eveProject.findFirst({ where: { id: projectId, ownerId: user.id }, include: { files: true, conversations: { orderBy: { updatedAt: "desc" }, take: 1, include: { messages: { orderBy: { createdAt: "asc" } } } }, runs: { orderBy: { createdAt: "desc" }, take: 10, include: { events: { orderBy: { sequence: "asc" } } } } } });
  if (!row) throw new AuthorizationError("Eve project not found or not owned by this user.");
  return stored(row);
}

export async function saveEveProject(projectId: string, user: MarketplaceUser, project: AgentProject) {
  await owned(projectId, user);
  await prisma.$transaction(async (tx) => {
    await tx.eveProject.update({ where: { id: projectId }, data: { name: project.metadata.displayName, description: project.metadata.description, config: project as unknown as Prisma.InputJsonValue } });
    for (const file of project.files) await tx.eveProjectFile.upsert({ where: { projectId_path: { projectId, path: file.path } }, create: { projectId, path: file.path, content: file.content, generated: file.generated !== false }, update: { content: file.content, generated: file.generated !== false, version: { increment: 1 } } });
  });
  return getEveProject(projectId, user);
}

export async function appendEveMessage(projectId: string, user: MarketplaceUser, role: "user" | "assistant", content: string, metadata?: Record<string, unknown>) {
  const project = await owned(projectId, user);
  let conversation = await prisma.eveConversation.findFirst({ where: { projectId }, orderBy: { updatedAt: "desc" } });
  conversation ??= await prisma.eveConversation.create({ data: { projectId, title: project.name } });
  return prisma.eveMessage.create({ data: { conversationId: conversation.id, role, content, metadata: metadata as Prisma.InputJsonValue | undefined } });
}

export async function createEveRun(projectId: string, user: MarketplaceUser, prompt: string, model: string) {
  await owned(projectId, user);
  const conversation = await prisma.eveConversation.findFirst({ where: { projectId }, orderBy: { updatedAt: "desc" } });
  return prisma.eveBuildRun.create({ data: { projectId, conversationId: conversation?.id, prompt, model, status: "running", startedAt: new Date(), events: { create: { sequence: 1, type: "started", status: "running", title: "Build started" } } } });
}

export async function updateEveRun(runId: string, user: MarketplaceUser, data: { status?: string; currentBatch?: number; error?: string | null; event?: { type: string; status: string; title: string; detail?: string } }) {
  const run = await prisma.eveBuildRun.findFirst({ where: { id: runId, project: { ownerId: user.id } }, include: { events: { orderBy: { sequence: "desc" }, take: 1 } } });
  if (!run) throw new AuthorizationError("Eve build run not found or not owned by this user.");
  if (data.event) await prisma.eveBuildEvent.create({ data: { runId, sequence: (run.events[0]?.sequence ?? 0) + 1, ...data.event } });
  return prisma.eveBuildRun.update({ where: { id: runId }, data: { status: data.status, currentBatch: data.currentBatch, error: data.error, completedAt: data.status === "completed" || data.status === "failed" ? new Date() : undefined }, include: { events: { orderBy: { sequence: "asc" } } } });
}

async function owned(projectId: string, user: MarketplaceUser) {
  const row = await prisma.eveProject.findFirst({ where: { id: projectId, ownerId: user.id } });
  if (!row) throw new AuthorizationError("Eve project not found or not owned by this user.");
  return row;
}

function stored(row: any) {
  const config = row.config as AgentProject;
  return { id: row.id, project: { ...config, files: row.files?.map((file: any) => ({ path: file.path, content: file.content, generated: file.generated })) ?? config.files }, conversation: row.conversations?.[0] ?? null, runs: row.runs ?? [], updatedAt: row.updatedAt.toISOString() };
}

function slug(value: string) {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled-agent";
  return `${base}-${Date.now().toString(36)}`;
}
