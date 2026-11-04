import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/auth";
import { exportVault } from "@/lib/vault";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await ensureUser();
  const vault = await exportVault(userId);

  return new NextResponse(JSON.stringify(vault, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="digital-twin-vault-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
