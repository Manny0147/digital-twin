import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";

/**
 * Resolve the internal user id from a Clerk session or a bearer token
 * used by the Expo mobile shell.
 */
export async function resolveMobileUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // Placeholder: in production verify the Clerk JWT or session token
    // For now fall through to cookie-based auth when available
    void token;
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await prisma.user.findUnique({ where: { clerkId } });
  return user ? { id: user.id } : null;
}
