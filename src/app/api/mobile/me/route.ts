import { NextResponse } from "next/server";
import { resolveMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const user = await resolveMobileUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, displayName: true, avatarUrl: true, bio: true },
  });
  return NextResponse.json(full);
}
