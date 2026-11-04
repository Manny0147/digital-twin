import { prisma } from "./db";
import {
  Memory,
  MemorySource,
  MemoryStatus,
  MemoryType,
  MemoryVersion,
} from "@prisma/client";
import { z } from "zod";
import { logPermissionEvent } from "./permissions";
import { generateEmbedding, toPgVector } from "./ai/embeddings";
import { sanitizeMemoryContent } from "./sanitize";
import { limiters } from "./rate-limit";
import {
  encryptText,
  decryptText,
  isEncryptedPayload,
  type EncryptedPayload,
} from "./crypto";

const ENC_PREFIX = "__enc__:";

export const CreateMemorySchema = z.object({
  content: z.string().min(1).max(10000),
  type: z.nativeEnum(MemoryType).default(MemoryType.FACT),
  source: z.nativeEnum(MemorySource).default(MemorySource.USER),
  tags: z.array(z.string().max(50)).max(20).default([]),
  confidence: z.number().min(0).max(1).default(1),
  importance: z.number().int().min(1).max(10).default(5),
  timeRangeStart: z.coerce.date().optional().nullable(),
  timeRangeEnd: z.coerce.date().optional().nullable(),
  relatedPeople: z.array(z.string().max(100)).max(20).default([]),
  metadata: z.record(z.unknown()).default({}),
  /** Mark memory as high-sensitivity — requires passphrase */
  sensitive: z.boolean().default(false),
  /** Passphrase used only for this write; never stored */
  passphrase: z.string().min(8).max(200).optional(),
});

export const UpdateMemorySchema = CreateMemorySchema.partial().extend({
  changeNote: z.string().max(500).optional(),
});

export const DecryptMemorySchema = z.object({
  memoryId: z.string().uuid(),
  passphrase: z.string().min(8).max(200),
});

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>;

async function embedIfPossible(content: string): Promise<string | null> {
  try {
    const vec = await generateEmbedding(content);
    return toPgVector(vec);
  } catch {
    return null;
  }
}

export async function createMemory(userId: string, input: CreateMemoryInput) {
  await limiters.memory.limit(userId);
  const parsed = CreateMemorySchema.parse(input);
  const sanitized = sanitizeMemoryContent(parsed.content);

  let storedContent = sanitized;
  let isEncrypted = false;

  if (parsed.sensitive) {
    if (!parsed.passphrase) throw new Error("Passphrase required for sensitive memory");
    storedContent = ENC_PREFIX + (await encryptText(sanitized, parsed.passphrase));
    isEncrypted = true;
  }

  const embedding = isEncrypted ? null : await embedIfPossible(sanitized);

  const memory = await prisma.memory.create({
    data: {
      userId,
      content: storedContent,
      type: parsed.type,
      source: parsed.source,
      tags: parsed.tags,
      confidence: parsed.confidence,
      importance: parsed.importance,
      timeRangeStart: parsed.timeRangeStart,
      timeRangeEnd: parsed.timeRangeEnd,
      relatedPeople: parsed.relatedPeople,
      metadata: parsed.metadata as object,
      isEncrypted,
      embedding: embedding ? embedding : undefined,
      createdBy: "user",
    },
  });

  await prisma.memoryVersion.create({
    data: {
      memoryId: memory.id,
      userId,
      version: 1,
      content: storedContent,
      changeNote: "Initial version",
      createdBy: "user",
    },
  });

  await logPermissionEvent({
    userId,
    action: "CREATE_MEMORY",
    actor: userId,
    actorType: "USER",
    resource: memory.id,
    metadata: { type: parsed.type, encrypted: isEncrypted },
  });

  return memory;
}

export async function updateMemory(
  userId: string,
  memoryId: string,
  input: UpdateMemoryInput
) {
  await limiters.memory.limit(userId);
  const existing = await prisma.memory.findFirst({
    where: { id: memoryId, userId, status: { not: MemoryStatus.DELETED } },
  });
  if (!existing) throw new Error("Memory not found");

  const parsed = UpdateMemorySchema.parse(input);
  const newContent = parsed.content
    ? sanitizeMemoryContent(parsed.content)
    : existing.content;

  let storedContent = newContent;
  let isEncrypted = existing.isEncrypted;

  if (parsed.sensitive === true && parsed.passphrase) {
    storedContent = ENC_PREFIX + (await encryptText(newContent, parsed.passphrase));
    isEncrypted = true;
  } else if (parsed.sensitive === false) {
    isEncrypted = false;
  }

  const nextVersion = existing.version + 1;
  const embedding = isEncrypted ? null : await embedIfPossible(
    isEncrypted ? existing.content : newContent
  );

  const updated = await prisma.memory.update({
    where: { id: memoryId },
    data: {
      content: storedContent,
      type: parsed.type ?? existing.type,
      source: parsed.source ?? existing.source,
      tags: parsed.tags ?? existing.tags,
      confidence: parsed.confidence ?? existing.confidence,
      importance: parsed.importance ?? existing.importance,
      timeRangeStart: parsed.timeRangeStart ?? existing.timeRangeStart,
      timeRangeEnd: parsed.timeRangeEnd ?? existing.timeRangeEnd,
      relatedPeople: parsed.relatedPeople ?? existing.relatedPeople,
      metadata: (parsed.metadata as object) ?? existing.metadata,
      isEncrypted,
      version: nextVersion,
      embedding: embedding ? embedding : undefined,
      updatedAt: new Date(),
    },
  });

  await prisma.memoryVersion.create({
    data: {
      memoryId,
      userId,
      version: nextVersion,
      content: storedContent,
      changeNote: parsed.changeNote ?? "Updated",
      createdBy: "user",
    },
  });

  await logPermissionEvent({
    userId,
    action: "UPDATE_MEMORY",
    actor: userId,
    actorType: "USER",
    resource: memoryId,
    metadata: { version: nextVersion },
  });

  return updated;
}

export async function decryptMemoryContent(
  userId: string,
  memoryId: string,
  passphrase: string
): Promise<string> {
  const memory = await prisma.memory.findFirst({
    where: { id: memoryId, userId },
  });
  if (!memory) throw new Error("Memory not found");
  if (!memory.isEncrypted || !memory.content.startsWith(ENC_PREFIX)) {
    return memory.content;
  }
  const payload = memory.content.slice(ENC_PREFIX.length);
  return decryptText(payload, passphrase);
}

export async function listMemories(userId: string) {
  return prisma.memory.findMany({
    where: { userId, status: { not: MemoryStatus.DELETED } },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
  });
}

export async function archiveMemory(userId: string, memoryId: string) {
  const memory = await prisma.memory.update({
    where: { id: memoryId, userId },
    data: { status: MemoryStatus.ARCHIVED },
  });
  await logPermissionEvent({
    userId,
    action: "ARCHIVE_MEMORY",
    actor: userId,
    actorType: "USER",
    resource: memoryId,
  });
  return memory;
}
