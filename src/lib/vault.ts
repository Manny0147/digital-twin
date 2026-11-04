import { prisma } from "./db";

export interface VaultExport {
  version: 1;
  exportedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    bio: string | null;
    timezone: string;
  };
  memories: Array<{
    id: string;
    content: string;
    type: string;
    source: string;
    status: string;
    isEncrypted: boolean;
    tags: string[];
    confidence: number;
    importance: number;
    metadata: unknown;
    createdAt: string;
    updatedAt: string;
  }>;
  grants: Array<{
    id: string;
    granteeType: string;
    granteeLabel: string | null;
    scopes: string[];
    purpose: string;
    expiresAt: string | null;
    revokedAt: string | null;
  }>;
  personality: {
    traits: unknown;
    speakingStyle: string | null;
    values: string[];
    avoidTopics: string[];
    preferredTone: string | null;
  } | null;
}

export async function exportVault(userId: string): Promise<VaultExport> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const memories = await prisma.memory.findMany({
    where: { userId, status: { not: "DELETED" } },
    orderBy: { updatedAt: "desc" },
  });
  const grants = await prisma.consentGrant.findMany({ where: { userId } });
  const personality = await prisma.personalityProfile.findUnique({ where: { userId } });

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      timezone: user.timezone,
    },
    memories: memories.map((m) => ({
      id: m.id,
      content: m.content,
      type: m.type,
      source: m.source,
      status: m.status,
      isEncrypted: m.isEncrypted,
      tags: m.tags,
      confidence: m.confidence,
      importance: m.importance,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    grants: grants.map((g) => ({
      id: g.id,
      granteeType: g.granteeType,
      granteeLabel: g.granteeLabel,
      scopes: g.scopes,
      purpose: g.purpose,
      expiresAt: g.expiresAt?.toISOString() ?? null,
      revokedAt: g.revokedAt?.toISOString() ?? null,
    })),
    personality: personality
      ? {
          traits: personality.traits,
          speakingStyle: personality.speakingStyle,
          values: personality.values,
          avoidTopics: personality.avoidTopics,
          preferredTone: personality.preferredTone,
        }
      : null,
  };
}
