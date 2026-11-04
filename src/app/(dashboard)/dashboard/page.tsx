import Link from "next/link";
import { ensureUser } from "@/lib/auth";
import { listMemories } from "@/lib/memories";
import { listGrants } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const { id: userId } = await ensureUser();
  const [memories, grants] = await Promise.all([
    listMemories(userId),
    listGrants(userId),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Your twin</h1>
      <p className="mt-2 text-muted">
        {memories.length} memories · {grants.filter((g) => !g.revokedAt).length} active grants
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/memories">
          <div className="rounded-lg border border-border bg-card p-6 hover:border-primary/50">
            <h2 className="font-medium">Memories</h2>
            <p className="mt-1 text-sm text-muted">Editable, versioned, owned.</p>
          </div>
        </Link>
        <Link href="/chat">
          <div className="rounded-lg border border-border bg-card p-6 hover:border-primary/50">
            <h2 className="font-medium">Chat</h2>
            <p className="mt-1 text-sm text-muted">Transparent AI with citations.</p>
          </div>
        </Link>
        <Link href="/grants">
          <div className="rounded-lg border border-border bg-card p-6 hover:border-primary/50">
            <h2 className="font-medium">Access</h2>
            <p className="mt-1 text-sm text-muted">Consent-based, revocable.</p>
          </div>
        </Link>
        <Link href="/settings">
          <div className="rounded-lg border border-border bg-card p-6 hover:border-primary/50">
            <h2 className="font-medium">Settings</h2>
            <p className="mt-1 text-sm text-muted">Personality, vault, privacy.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
