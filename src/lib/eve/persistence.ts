import type { Prisma } from "@prisma/client";
import { AuthorizationError } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import type { MarketplaceUser } from "@/lib/types";
import type { AgentProject } from "./agent-project";

export type EveStoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export async function listEveProjects(user: MarketplaceUser) {
  return prisma.eveProject.findMany({
    where: { ownerId: user.id },
    select: { id: true, name