import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/auth";
import { importVault } from "@/lib/vault-import";
import type { VaultExport } from "@/lib/vault";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await ensureUser();
  const body = await req.json();
  const vault = body.vault as VaultExport | undefined;
  const passphrase = body.passphrase as string | undefined;

  if (!vault || vault.version !== 1) {
    return NextResponse.json({ error: "Invalid vault" }, { status: 400 });
  }

  try {
    const result = await importVault({ userId, vault, passphrase });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    const status = message === "Rate limited" ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
