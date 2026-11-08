import { prisma } from "./db";
import { z } from "zod";

export const CreateThreadSchema = z.object({
  title: z.string().max(200).optional(),
  sessionId: z.string().uuid().optional().nullable(),
});

export async function createThread(userId: string, input: z.infer<typeof CreateThreadSchema> = {}) {
  return prisma.chatThread.create({
    data: {
      userId,
      title: input.title ?? null,
      sessionId: input.sessionId ?? null,
    },
  });
}

export async function listThreads(userId: string) {
  return prisma.chatThread.findMany({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export type ThreadWithPreview = Awaited<ReturnType<typeof listThreads>>[number];

export async function getThread(userId: string, threadId: string) {
  return prisma.chatThread.findFirst({
    where: { id: threadId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { citations: true },
      },
    },
  });
}

export async function addMessage(params: {
  threadId: string;
  userId: string;
  role: string;
  content: string;
  model?: string | null;
  isGenerated?: boolean;
  citations?: Array<{
    memoryId: string;
    relevance?: number | null;
    excerpt?: string | null;
    reason?: string | null;
  }>;
}) {
  const message = await prisma.chatMessage.create({
    data: {
      threadId: params.threadId,
      userId: params.userId,
      role: params.role,
      content: params.content,
      model: params.model ?? null,
      isGenerated: params.isGenerated ?? false,
    },
  });

  if (params.citations?.length) {
    await prisma.messageCitation.createMany({
      data: params.citations.map((c) => ({
        messageId: message.id,
        memoryId: c.memoryId,
        relevance: c.relevance ?? null,
        excerpt: c.excerpt ?? null,
        reason: c.reason ?? null,
      })),
    });
  }

  await prisma.chatThread.update({
    where: { id: params.threadId },
    data: { updatedAt: new Date() },
  });

  return message;
}

export async function archiveThread(userId: string, threadId: string) {
  return prisma.chatThread.update({
    where: { id: threadId, userId },
    data: { isArchived: true },
  });
}
