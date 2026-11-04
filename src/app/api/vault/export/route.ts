import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireInternalUserId } from "@/lib/auth";
import { exportVault } from "@/lib/vault";
import { limiters } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await requireInternalUserId();
  const rl = limiters.export(userId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Export rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
  }

  const vault = await exportVault(userId);
  const filename = `digital-twin-vault-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(vault, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Vault-Version": "1.0",
    },
  });
}
