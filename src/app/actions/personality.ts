"use server";

import { revalidatePath } from "next/cache";
import { requireInternalUserId } from "@/lib/auth";
import { getPersonality, upsertPersonality, PersonalitySchema } from "@/lib/personality";

export async function getPersonalityAction() {
  const userId = await requireInternalUserId();
  const profile = await getPersonality(userId);
  return { profile };
}

export async function savePersonalityAction(raw: unknown) {
  const userId = await requireInternalUserId();
  const input = PersonalitySchema.parse(raw);
  const profile = await upsertPersonality(userId, input);
  revalidatePath("/settings");
  revalidatePath("/chat");
  return { success: true, profile };
}
