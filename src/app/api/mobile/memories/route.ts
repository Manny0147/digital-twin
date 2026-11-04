import { NextResponse } from "next/server";
import { resolveMobileUser } from "@/lib/mobile-auth";
import { listMemories } from "@/lib/memories";

export async function GET(req: Request) {
  const user = await resolveMobileUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memories = await listMemories(user.id);
  return NextResponse.json({
    memories: memories.map((m) => ({
      id: m.id,
      content: m.isEncrypted ? "[encrypted]" : m.content,
      type: m.type,
      importance: m.importance,
      isEncrypted: m.isEncrypted,
      updatedAt: m.updatedAt,
    })),
  });
}
