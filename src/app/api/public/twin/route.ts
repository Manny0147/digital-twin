import { NextResponse } from "next/server";
import { resolveGrantByToken } from "@/lib/permissions";
import { runTwinChat } from "@/lib/ai/orchestrator";
import { ConsentScope } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.json();
  const token = String(body.token ?? "");
  const message = String(body.message ?? "").trim();
  if (!token || !message) {
    return NextResponse.json({ error: "Missing token or message" }, { status: 400 });
  }

  const grant = await resolveGrantByToken(token);
  if (!grant) return NextResponse.json({ error: "Invalid or revoked link" }, { status: 403 });

  if (!grant.scopes.includes(ConsentScope.CHAT)) {
    return NextResponse.json({ error: "Chat not permitted" }, { status: 403 });
  }

  const { result, citations } = await runTwinChat({
    userId: grant.userId,
    threadId: "public",
    userMessage: message,
    grantId: grant.id,
  });

  const text = await result.text;
  return NextResponse.json({ text, citations });
}
