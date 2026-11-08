import { auth, verifyToken } from "@clerk/nextjs/server";
import { prisma } from "./db";

/**
 * Resolve the internal user id from a verified Clerk session cookie
 * or a verified Clerk bearer token used by the Expo shell.
 * An unverified bearer token is rejected and does not fall through.
 */
export async function resolveMobileUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!token || !secretKey) return null;
    try {
      const verified = await verifyToken(token, { secretKey });
      if (!verified.sub) return null;
      const user = await prisma.user.findUnique({ where: { clerkId: verified.sub } });
      return user && !user.deletedAt ? { id: user.id } : null;
    } catch {
      return null;
    }
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await prisma.user.findUnique({ where: { clerkId } });
  return user && !user.deletedAt ? { id: user.id } : null;
}
