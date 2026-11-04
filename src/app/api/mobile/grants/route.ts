import { NextResponse } from "next/server";
import { resolveMobileUser } from "@/lib/mobile-auth";
import { listGrants } from "@/lib/permissions";

export async function GET(req: Request) {
  const user = await resolveMobileUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grants = await listGrants(user.id);
  return NextResponse.json({ grants });
}
