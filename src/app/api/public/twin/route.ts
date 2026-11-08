import { NextResponse } from "next/server";
import { ConsentScope } from "@prisma/client";
import {
  assertGrantAccess,
  hashToken,
  resolveGrantByToken,
} from "@/lib/permissions";
import { runTwinChat } from "@/lib/ai/orchestrator";
import { limiters } from "@/lib/rate-limit";
import { sanitizeChatInput } from "@/lib/sanitize";
import { toPublicTwinMeta } from "@/lib/public-twin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requesterKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown";
  return ip.replace(/[^\w.:-]/g, "").slice(0, 64) || "unknown";
}

async function enforcePublicLimit(token: string, req: Request) {
  const ip = requesterKey(req);
  const [byToken, byIp] = await Promise.all([
    limiters.publicToken.limit(hashToken(token)),
    limiters.publicIp.limit(ip),
  ]);
  return byToken.success && byIp.success;
}

function modelError(err: unknown) {
  const message = err instanceof Error ? err.message : "Request failed";
  if (message === "OPENAI_API_KEY not configured") {
    return NextResponse.json({ error: "The twin model is not configured." }, { status: 503 });
  }
  if (
    message === "Access denied" ||
    message === "Insufficient scope" ||
    message === "Usage limit exceeded" ||
    message === "Chat not permitted"
  ) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  console.error(err);
  return NextResponse.json({ error: "Request failed" }, { status: 500 });
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (!(await enforcePublicLimit(token, req))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const grant = await resolveGrantByToken(token);
  if (!grant || grant.user.deletedAt) {
    return NextResponse.json({ error: "Invalid or revoked link" }, { status: 403 });
  }

  return NextResponse.json(toPublicTwinMeta(grant));
}

export async function POST(req: Request) {
  let body: { token?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const message = sanitizeChatInput(String(body.message ?? ""));
  if (!token || !message) {
    return NextResponse.json({ error: "Missing token or message" }, { status: 400 });
  }
  if (!(await enforcePublicLimit(token, req))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const grant = await resolveGrantByToken(token);
  if (!grant || grant.user.deletedAt) {
    return NextResponse.json({ error: "Invalid or revoked link" }, { status: 403 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "The twin model is not configured." }, { status: 503 });
  }

  try {
    await assertGrantAccess({
      userId: grant.userId,
      grantId: grant.id,
      requiredScope: ConsentScope.CHAT,
      actor: grant.granteeLabel || grant.granteeId || "public-link",
      ipAddress: requesterKey(req),
      userAgent: req.headers.get("user-agent"),
    });

    const { result, citations } = await runTwinChat({
      userId: grant.userId,
      threadId: grant.id,
      userMessage: message,
      grantId: grant.id,
    });
    const text = await result.text;
    return NextResponse.json({ text, citations });
  } catch (err) {
    return modelError(err);
  }
}
