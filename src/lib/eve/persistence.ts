import type { Prisma } from "@prisma/client";
import { AuthorizationError } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import type { MarketplaceUser } from "@/lib/types";
import type { AgentProject } from "./agent-project";
import { redactSecrets } from "./secrets";

export const EVE_STALE_RUN_TIMEOUT_MS = 10 * 60 * 1000;
export type EveProjectStatus = "draft" | "building" | "ready" | "failed";

export async function listEveProjects(user: MarketplaceUser) {
  await reclaimStaleEveRuns(user);
  return prisma.eveProject.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, slug: true, status: true, updatedAt: true } });
}

export async function createEveProject(user: MarketplaceUser, project: AgentProject) {
  await prisma.user.upsert({ where: { id: user.id }, create: { id: user.id, clerkId: user.clerkId, name: user.name, email: user.email, role: user.role }, update: { clerkId: user.clerkId, name: user.name, email: user.email, role: user.role } });
  const row = await prisma.eveProject.create({ data: { ownerId: user.id, name: project.metadata.displayName, slug: slug(project.metadata.directoryName), description: project.metadata.description, status: "draft", config: project as unknown as Prisma.InputJsonValue, conversations: { create: { title: project.metadata.displayName } }, files: { create: project.files.map((file) => ({ path: file.path, content: file.content, generated: file.generated !== false })) } }, include: { conversations: { take: 1 }, files: true, runs: { orderBy: { createdAt: "desc" }, take: 10, include: { events: { orderBy: { sequence: "asc" } } } } } });
  return stored(row);
}

export async function getEveProject(projectId: string, user: MarketplaceUser) {
  await reclaimStaleEveRuns(user, projectId);
  const row = await prisma.eveProject.findFirst({ where: { id: projectId, ownerId: user.id }, include: { files: true, conversations: { orderBy: { updatedAt: "desc" }, take: 1, include: { messages: { orderBy: { createdAt: "asc" } } } }, runs: { orderBy: { createdAt: "desc" }, take: 10, include: { events: { orderBy: { sequence: "asc" } } } } } });
  if (!row) throw new AuthorizationError("Eve project not found or not owned by this user.");
  return stored(row);
}

export async function saveEveProject(projectId: string, user: MarketplaceUser, project: AgentProject, options?: { fromBuild?: boolean }) {
  const current = await owned(projectId, user);
  const nextStatus: EveProjectStatus = options?.fromBuild
    ? (current.status as EveProjectStatus) || "building"
    : current.status === "ready" || current.status === "failed"
      ? "draft"
      : ((current.status as EveProjectStatus) || "draft");
  await prisma.$transaction(async (tx) => {
    await tx.eveProject.update({
      where: { id: projectId },
      data: {
        name: project.metadata.displayName,
        description: project.metadata.description,
        config: project as unknown as Prisma.InputJsonValue,
        status: nextStatus,
      },
    });
    for (const file of project.files) await tx.eveProjectFile.upsert({ where: { projectId_path: { projectId, path: file.path } }, create: { projectId, path: file.path, content: file.content, generated: file.generated !== false }, update: { content: file.content, generated: file.generated !== false, version: { increment: 1 } } });
  });
  return getEveProject(projectId, user);
}

export async function setEveProjectStatus(projectId: string, user: MarketplaceUser, status: EveProjectStatus) {
  await owned(projectId, user);
  await prisma.eveProject.update({ where: { id: projectId }, data: { status } });
}

export async function appendEveMessage(projectId: string, user: MarketplaceUser, role: "user" | "assistant", content: string, metadata?: Record<string, unknown>) {
  const project = await owned(projectId, user);
  let conversation = await prisma.eveConversation.findFirst({ where: { projectId }, orderBy: { updatedAt: "desc" } });
  conversation ??= await prisma.eveConversation.create({ data: { projectId, title: project.name } });
  return prisma.eveMessage.create({ data: { conversationId: conversation.id, role, content: redactSecrets(content), metadata: metadata as Prisma.InputJsonValue | undefined } });
}

export async function createEveRun(projectId: string, user: MarketplaceUser, prompt: string, model: string) {
  await reclaimStaleEveRuns(user, projectId);
  await owned(projectId, user);
  const conversation = await prisma.eveConversation.findFirst({ where: { projectId }, orderBy: { updatedAt: "desc" } });
  const run = await prisma.$transaction(async (tx) => {
    await tx.eveProject.update({ where: { id: projectId }, data: { status: "building" } });
    return tx.eveBuildRun.create({
      data: {
        projectId,
        conversationId: conversation?.id,
        prompt: redactSecrets(prompt),
        model,
        status: "running",
        startedAt: new Date(),
        events: { create: { sequence: 1, type: "started", status: "running", title: "Build started" } },
      },
    });
  });
  return run;
}

export async function updateEveRun(runId: string, user: MarketplaceUser, data: { status?: string; currentBatch?: number; error?: string | null; event?: { type: string; status: string; title: string; detail?: string; metadata?: Record<string, unknown> } }) {
  const run = await prisma.eveBuildRun.findFirst({ where: { id: runId, project: { ownerId: user.id } }, include: { events: { orderBy: { sequence: "desc" }, take: 1 } } });
  if (!run) throw new AuthorizationError("Eve build run not found or not owned by this user.");
  if (data.event) {
    const { metadata, ...event } = data.event;
    await prisma.eveBuildEvent.create({
      data: {
        runId,
        sequence: (run.events[0]?.sequence ?? 0) + 1,
        ...event,
        detail: event.detail ? redactSecrets(event.detail) : event.detail,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
  const updated = await prisma.eveBuildRun.update({
    where: { id: runId },
    data: {
      status: data.status,
      currentBatch: data.currentBatch,
      error: data.error == null ? data.error : redactSecrets(data.error),
      completedAt: data.status === "completed" || data.status === "failed" ? new Date() : undefined,
    },
    include: { events: { orderBy: { sequence: "asc" } } },
  });

  if (data.status === "completed") {
    await prisma.eveProject.update({ where: { id: run.projectId }, data: { status: "ready" } });
  } else if (data.status === "failed") {
    await prisma.eveProject.update({ where: { id: run.projectId }, data: { status: "failed" } });
  }

  return updated;
}

/** Mark abandoned running runs as failed after the stale timeout. Active builds stay safe because events/updatedAt refresh the activity clock. */
export async function reclaimStaleEveRuns(user: MarketplaceUser, projectId?: string) {
  const cutoff = new Date(Date.now() - EVE_STALE_RUN_TIMEOUT_MS);
  const running = await prisma.eveBuildRun.findMany({
    where: {
      status: "running",
      project: { ownerId: user.id, ...(projectId ? { id: projectId } : {}) },
    },
    include: { events: { orderBy: { sequence: "desc" }, take: 1 } },
  });

  const stale = running.filter((run) => {
    const activity = run.events[0]?.createdAt ?? run.updatedAt ?? run.startedAt ?? run.createdAt;
    return activity.getTime() < cutoff.getTime();
  });

  for (const run of stale) {
    const sequence = (run.events[0]?.sequence ?? 0) + 1;
    await prisma.$transaction(async (tx) => {
      await tx.eveBuildEvent.create({
        data: {
          runId: run.id,
          sequence,
          type: "recovery",
          status: "failed",
          title: "Run marked stale",
          detail: "This build was still marked running with no activity for 10 minutes, so Eve closed it automatically.",
          metadata: { reason: "stale_timeout", timeoutMinutes: 10 } as Prisma.InputJsonValue,
        },
      });
      await tx.eveBuildRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          error: "Build timed out after 10 minutes without progress.",
          completedAt: new Date(),
        },
      });
      const latest = await tx.eveBuildRun.findFirst({ where: { projectId: run.projectId }, orderBy: { createdAt: "desc" }, select: { id: true } });
      const project = await tx.eveProject.findUnique({ where: { id: run.projectId }, select: { status: true } });
      if (latest?.id === run.id && project?.status === "building") {
        await tx.eveProject.update({ where: { id: run.projectId }, data: { status: "failed" } });
      }
    });
  }

  return stale.length;
}

async function owned(projectId: string, user: MarketplaceUser) {
  const row = await prisma.eveProject.findFirst({ where: { id: projectId, ownerId: user.id } });
  if (!row) throw new AuthorizationError("Eve project not found or not owned by this user.");
  return row;
}

function stored(row: any) {
  const config = row.config as AgentProject;
  return {
    id: row.id,
    status: row.status ?? "draft",
    project: { ...config, files: row.files?.map((file: any) => ({ path: file.path, content: file.content, generated: file.generated })) ?? config.files },
    conversation: row.conversations?.[0] ?? null,
    runs: (row.runs ?? []).map((run: any) => ({
      ...run,
      startedAt: run.startedAt?.toISOString?.() ?? run.startedAt ?? null,
      completedAt: run.completedAt?.toISOString?.() ?? run.completedAt ?? null,
      createdAt: run.createdAt?.toISOString?.() ?? run.createdAt,
      updatedAt: run.updatedAt?.toISOString?.() ?? run.updatedAt,
      events: (run.events ?? []).map((event: any) => ({
        ...event,
        createdAt: event.createdAt?.toISOString?.() ?? event.createdAt,
      })),
    })),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slug(value: string) {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled-agent";
  return `${base}-${Date.now().toString(36)}`;
}
