"use server";

import { ensureUser } from "@/lib/auth";
import { createThread, getThread, listThreads } from "@/lib/chat";

export async function listThreadsAction() {
  const { id } = await ensureUser();
  return listThreads(id);
}

export async function getThreadAction(threadId: string) {
  const { id } = await ensureUser();
  return getThread(id, threadId);
}

export async function createThreadAction(title?: string) {
  const { id } = await ensureUser();
  return createThread(id, { title });
}
