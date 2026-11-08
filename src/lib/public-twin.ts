import { ConsentScope } from "@prisma/client";
import { accessFromScopes } from "./permissions";

export function toPublicTwinMeta(grant: {
  purpose: string;
  scopes: ConsentScope[];
  expiresAt: Date | null;
  granteeLabel: string | null;
  maxUses: number | null;
  useCount: number;
  user: { displayName: string | null };
}) {
  const access = accessFromScopes(grant.scopes);
  const usesRemaining = grant.maxUses === null || grant.useCount < grant.maxUses;
  return {
    ownerName: grant.user.displayName?.trim() || "Digital twin owner",
    purpose: grant.purpose,
    scopes: grant.scopes,
    expiresAt: grant.expiresAt ? grant.expiresAt.toISOString() : null,
    granteeLabel: grant.granteeLabel,
    canChat: access.chat && usesRemaining,
  };
}
