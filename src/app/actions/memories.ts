"use server";

import { revalidatePath } from "next/cache";
import {
  createMemory, updateMemory, deleteMemory, listMemories, getMemory,
  getMemoryHistory, acceptSuggestedMemory, decryptMemoryContent,
  CreateMemorySchema, UpdateMemorySchema, DecryptMemorySchema,
} from "@/lib/memories";
import { requireInternalUserId } from "@/lib/auth";

export async function createMemoryAction(raw: unknown) {
  const userId = await requireInternalUserId();
  const input = CreateMemorySchema.parse(raw);
  const memory = await createMemory(userId, input);
  revalidatePath("/memories");
  return { success: true, memory };
}

export async function updateMemoryAction(memoryId: string, raw: unknown) {
  const userId = await requireInternalUserId();
  const input = UpdateMemorySchema.parse(raw);
  const memory = await updateMemory(userId, memoryId, input);
  revalidatePath("/memories");
  return { success: true, memory };
}

export async function deleteMemoryAction(memoryId: string) {
  const userId = await requireInternalUserId();
  await deleteMemory(userId, memoryId);
  revalidatePath("/memories");
  return { success: true };
}

export async function listMemoriesAction(opts?: { search?: string; type?: string; limit?: number; offset?: number }) {
  const userId = await requireInternalUserId();
  return listMemories(userId, { search: opts?.search, type: opts?.type as any, limit: opts?.limit, offset: opts?.offset });
}

export async function getMemoryAction(memoryId: string) {
  const userId = await requireInternalUserId();
  const memory = await getMemory(userId, memoryId);
  if (!memory) throw new Error("Memory not found");
  return memory;
}

export async function getMemoryHistoryAction(memoryId: string) {
  const userId = await requireInternalUserId();
  return getMemoryHistory(userId, memoryId);
}

export async function acceptSuggestedMemoryAction(memoryId: string) {
  const userId = await requireInternalUserId();
  const memory = await acceptSuggestedMemory(userId, memoryId);
  revalidatePath("/memories");
  return { success: true, memory };
}

export async function decryptMemoryAction(raw: unknown) {
  const userId = await requireInternalUserId();
  const { memoryId, passphrase } = DecryptMemorySchema.parse(raw);
  return decryptMemoryContent(userId, memoryId, passphrase);
}
