import { BaseCheckpointSaver, type Checkpoint, type CheckpointMetadata, type CheckpointTuple } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import { prisma } from "../prisma";

export class PrismaCheckpointer extends BaseCheckpointSaver {
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const thread_id = config.configurable?.thread_id;
    const checkpoint_id = config.configurable?.checkpoint_id;

    if (!thread_id) return undefined;

    let row;
    if (checkpoint_id) {
      row = await prisma.graphCheckpoint.findUnique({
        where: {
          threadId_checkpointId: {
            threadId: thread_id,
            checkpointId: checkpoint_id,
          },
        },
      });
    } else {
      row = await prisma.graphCheckpoint.findFirst({
        where: { threadId: thread_id },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!row) return undefined;

    const writes = await prisma.graphCheckpointWrite.findMany({
      where: {
        threadId: thread_id,
        checkpointId: row.checkpointId,
      },
    });

    const pendingWrites = writes.map((w) => [w.taskId, w.channel, w.value] as [string, string, any]);

    return {
      config: {
        configurable: {
          thread_id,
          checkpoint_id: row.checkpointId,
        },
      },
      checkpoint: row.checkpoint as unknown as Checkpoint,
      metadata: row.metadata as unknown as CheckpointMetadata,
      parentConfig: row.parentCheckpointId
        ? {
            configurable: {
              thread_id,
              checkpoint_id: row.parentCheckpointId,
            },
          }
        : undefined,
      pendingWrites,
    };
  }

  async *list(config: RunnableConfig, options?: any): AsyncGenerator<CheckpointTuple> {
    const thread_id = config.configurable?.thread_id;
    if (!thread_id) return;

    const query: any = { threadId: thread_id };

    if (options?.before?.configurable?.checkpoint_id) {
      const beforeRow = await prisma.graphCheckpoint.findUnique({
        where: { threadId_checkpointId: { threadId: thread_id, checkpointId: options.before.configurable.checkpoint_id } },
      });
      if (beforeRow) {
        query.createdAt = { lt: beforeRow.createdAt };
      }
    }

    const rows = await prisma.graphCheckpoint.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
      take: options?.limit,
    });

    for (const row of rows) {
      yield {
        config: { configurable: { thread_id, checkpoint_id: row.checkpointId } },
        checkpoint: row.checkpoint as unknown as Checkpoint,
        metadata: row.metadata as unknown as CheckpointMetadata,
        parentConfig: row.parentCheckpointId ? { configurable: { thread_id, checkpoint_id: row.parentCheckpointId } } : undefined,
      };
    }
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata, newVersions: any): Promise<RunnableConfig> {
    const thread_id = config.configurable?.thread_id;
    const checkpoint_id = checkpoint.id;

    if (!thread_id) throw new Error("thread_id is required");

    const parentCheckpointId = config.configurable?.checkpoint_id;

    await prisma.graphCheckpoint.upsert({
      where: {
        threadId_checkpointId: {
          threadId: thread_id,
          checkpointId: checkpoint_id,
        },
      },
      update: {
        checkpoint: checkpoint as any,
        metadata: metadata as any,
        parentCheckpointId,
      },
      create: {
        threadId: thread_id,
        checkpointId: checkpoint_id,
        parentCheckpointId,
        checkpoint: checkpoint as any,
        metadata: metadata as any,
      },
    });

    return {
      configurable: {
        thread_id,
        checkpoint_id,
      },
    };
  }

  async putWrites(config: RunnableConfig, writes: [string, any][], taskId: string): Promise<void> {
    const thread_id = config.configurable?.thread_id;
    const checkpoint_id = config.configurable?.checkpoint_id;
    if (!thread_id || !checkpoint_id) return;

    const data = writes.map(([channel, value], idx) => ({
      threadId: thread_id,
      checkpointId: checkpoint_id,
      taskId,
      idx,
      channel,
      value: value as any,
    }));

    await prisma.graphCheckpointWrite.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async deleteThread(threadId: string): Promise<void> {
    if (!threadId) return;

    // Delete all checkpoints and writes for this thread
    await prisma.graphCheckpointWrite.deleteMany({
      where: { threadId },
    });
    
    await prisma.graphCheckpoint.deleteMany({
      where: { threadId },
    });
  }
}
