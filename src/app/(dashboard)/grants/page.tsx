import { ensureUser } from "@/lib/auth";
import { listGrants } from "@/lib/permissions";
import { GrantManager, type GrantView } from "@/components/grants/grant-manager";

export default async function GrantsPage() {
  const { id: userId } = await ensureUser();
  const grants = await listGrants(userId);
  const views: GrantView[] = grants.map((grant) => ({
    id: grant.id,
    granteeType: grant.granteeType,
    granteeLabel: grant.granteeLabel,
    scopes: grant.scopes,
    purpose: grant.purpose,
    expiresAt: grant.expiresAt?.toISOString() ?? null,
    revokedAt: grant.revokedAt?.toISOString() ?? null,
    maxUses: grant.maxUses,
    useCount: grant.useCount,
    hasShareLink: Boolean(grant.tokenHash),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Access grants</h1>
        <p className="mt-1 text-muted-foreground">
          Consent is explicit, scoped, and revocable. A share link only works while its grant is active.
        </p>
      </div>
      <GrantManager grants={views} />
    </div>
  );
}
