import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

/**
 * Ensures a corresponding User row exists for the Clerk user.
 * Call this at the start of any authenticated Server Action or RSC that needs ownership.
 */
export async function ensureUser(): Promise<{ id: string; clerkId: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Unauthorized");
  }

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkId}@placeholder.local`;

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {
      email,
      displayName:
        clerkUser.fullName ||
        clerkUser.firstName ||
        clerkUser.username ||
        undefined,
      avatarUrl: clerkUser.imageUrl,
    },
    create: {
      clerkId,
      email,
      displayName:
        clerkUser.fullName ||
        clerkUser.firstName ||
        clerkUser.username ||
        null,
      avatarUrl: clerkUser.imageUrl,
    },
  });

  return { id: user.id, clerkId: user.clerkId };
}

/**
 * Lightweight check — returns internal user id or throws.
 */
export async function requireInternalUserId(): Promise<string> {
  const { id } = await ensureUser();
  return id;
}
