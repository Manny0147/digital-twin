import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/auth";
import { runTwinChat } from "@/lib/ai/orchestrator";
import { addMessage, getThread } from "@/lib/chat";
import { sanitizeChatInput } from "@/lib/sanitize";
import { limiters } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await ensureUser();
  const limited = await limiters.chat.limit(userId);
  if (!limited.success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await req.json();
  const threadId = body.threadId as string | undefined;
  const message = sanitizeChatInput(String(body.message ?? ""));
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  let tid = threadId;
  if (!tid) {
    const { createThread } = await import("@/lib/chat");
    const thread = await createThread(userId, { title: message.slice(0, 60) });
    tid = thread.id;
  }

  await addMessage({
    threadId: tid,
    userId,
    role: "user",
    content: message,
  });

  const { result, citations } = await runTwinChat({
    userId,
    threadId: tid,
    userMessage: message,
  });

  const text = await result.text;

  const assistant = await addMessage({
    threadId: tid,
    userId,
    role: "assistant",
    content: text,
    model: "gpt-4o-mini",
    isGenerated: true,
    citations,
  });

  return NextResponse.json({
    threadId: tid,
    message: assistant,
    citations,
  });
}
