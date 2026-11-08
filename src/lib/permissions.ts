import { prisma } from "./db";
import {
  ConsentGrant,
  ConsentScope,
  GranteeType,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";

export const CreateGrantSchema = z.object({
  granteeType: z.nativeEnum(GranteeType),
  granteeId: z.string().max(200).optional().nullable(),
  granteeLabel: z.string().max(200).optional().nullable(),
  scopes: z.array(z.nativeEnum(ConsentScope)).min(1),
  purpose: z.string().min(1).max(2000),
  expiresAt: z.coerce.date().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
});

export type CreateGrantInput = z.infer<typeof CreateGrantSchema>;

export async function logPermissionEvent(params: {
  userId: string;
  action: string;
  actor: string;
  actorType: string;
  grantId?: string | null;
  resource?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return prisma.permissionAudit.create({
    data: {
      userId: params.userId,
      grantId: params.grantId ?? null,
      action: params.action,
      actor: params.actor,
      actorType: params.actorType,
      resource: params.resource ?? null,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}

export async function createGrant(userId: string, input: CreateGrantInput) {
  const parsed = CreateGrantSchema.parse(input);
  const grant = await prisma.consentGrant.create({
    data: {
      userId,
      granteeType: parsed.granteeType,
      granteeId: parsed.granteeId ?? null,
      granteeLabel: parsed.granteeLabel ?? null,
      scopes: parsed.scopes,
      purpose: parsed.purpose,
      expiresAt: parsed.expiresAt ?? null,
      maxUses: parsed.maxUses ?? null,
    },
  });

  await logPermissionEvent({
    userId,
    action: "CREATE_GRANT",
    actor: userId,
    actorType: "USER",
    grantId: grant.id,
    metadata: { scopes: parsed.scopes, granteeType: parsed.granteeType },
  });

  return grant;
}

export async function revokeGrant(
  userId: string,
  grantId: string,
  reason?: string
) {
  const grant = await prisma.consentGrant.update({
    where: { id: grantId, userId },
    data: {
      revokedAt: new Date(),
      revokedReason: reason ?? null,
    },
  });

  await logPermissionEvent({
    userId,
    action: "REVOKE_GRANT",
    actor: userId,
    actorType: "USER",
    grantId,
    metadata: { reason },
  });

  return grant;
}

export async function listGrants(userId: string) {
  return prisma.consentGrant.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function assertGrantAccess(params: {
  userId: string;
  grantId?: string | null;
  requiredScope: ConsentScope;
  actor: string;
}): Promise<ConsentGrant | null> {
  if (!params.grantId) return null;

  const grant = await prisma.consentGrant.findFirst({
    where: {
      id: params.grantId,
      userId: params.userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!grant) {
    await logPermissionEvent({
      userId: params.userId,
      action: "DENY",
      actor: params.actor,
      actorType: "GRANTEE",
      grantId: params.grantId,
      metadata: { reason: "not_found_or_expired" },
    });
    throw new Error("Access denied");
  }

  if (!grant.scopes.includes(params.requiredScope)) {
    await logPermissionEvent({
      userId: params.userId,
      action: "DENY",
      actor: params.actor,
      actorType: "GRANTEE",
      grantId: grant.id,
      metadata: { reason: "missing_scope", required: params.requiredScope },
    });
    throw new Error("Insufficient scope");
  }

  if (grant.maxUses !== null && grant.useCount >= grant.maxUses) {
    await logPermissionEvent({
      userId: params.userId,
      action: "DENY",
      actor: params.actor,
      actorType: "GRANTEE",
      grantId: grant.id,
      metadata: { reason: "max_uses_exceeded" },
    });
    throw new Error("Usage limit exceeded");
  }

  await prisma.consentGrant.update({
    where: { id: grant.id },
    data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
  });

  await logPermissionEvent({
    userId: params.userId,
    action: "USE",
    actor: params.actor,
    actorType: "GRANTEE",
    grantId: grant.id,
    metadata: { scope: params.requiredScope },
  });

  return grant;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPublicShareToken(userId: string, grantId: string) {
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  await prisma.consentGrant.update({
    where: { id: grantId, userId },
    data: { tokenHash },
  });
  return raw;
}

export async function resolveGrantByToken(token: string) {
  const tokenHash = hashToken(token);
  return prisma.consentGrant.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { user: true },
  });
}
