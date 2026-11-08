"use server";

import { revalidatePath } from "next/cache";
import { requireInternalUserId } from "@/lib/auth";
import {
  CreateGrantSchema,
  createGrant,
  createPublicShareToken,
  revokeGrant,
} from "@/lib/permissions";
import { assertWithinLimit, limiters } from "@/lib/rate-limit";

export async function createGrantAction(raw: unknown) {
  const userId = await requireInternalUserId();
  await assertWithinLimit(limiters.grant, userId);
  const input = CreateGrantSchema.parse(raw);
  const grant = await createGrant(userId, input);
  revalidatePath("/grants");
  return { id: grant.id };
}

export async function revokeGrantAction(grantId: string, reason?: string) {
  const userId = await requireInternalUserId();
  await assertWithinLimit(limiters.grant, userId);
  await revokeGrant(userId, grantId, reason);
  revalidatePath("/grants");
  revalidatePath("/audit");
  return { success: true };
}

export async function issueShareLinkAction(grantId: string) {
  const userId = await requireInternalUserId();
  await assertWithinLimit(limiters.grant, userId);
  const token = await createPublicShareToken(userId, grantId);
  revalidatePath("/grants");
  revalidatePath("/audit");
  return { path: `/t/${token}` };
}
