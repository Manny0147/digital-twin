import { prisma } from "../db";
import { generateEmbedding, toPgVector } from "./embeddings";
import { buildPersonalitySystemPrompt, getPersonality } from "../personality";
import { accessFromScopes } from "../permissions";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export interface Citation {
  memoryId: string;
  relevance: number;
  excerpt: string;
  reason: string;
}

export async function searchMemoriesByEmbedding(
  userId: string,
  query: string,
  limit = 8
): Promise<Array<{ id: string; content: string; similarity: number }>> {
  if (!process.env.OPENAI_API_KEY) return [];
  try {
    const embedding = await generateEmbedding(query);
    const vec = toPgVector(embedding);
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; content: string; similarity: number }>
    >(
      `SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM memories
       WHERE "userId" = $2::uuid
         AND status = 'ACTIVE'
         AND embedding IS NOT NULL
         AND "isEncrypted" = false
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vec,
      userId,
      limit
    );
    return rows;
  } catch {
    return [];
  }
}

export async function runTwinChat(params: {
  userId: string;
  threadId: string;
  userMessage: string;
  grantId?: string | null;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  let includeMemories = true;
  let includeProfile = true;
  if (params.grantId) {
    const grant = await prisma.consentGrant.findFirst({
      where: {
        id: params.grantId,
        userId: params.userId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!grant) throw new Error("Access denied");
    const access = accessFromScopes(grant.scopes);
    if (!access.chat) throw new Error("Insufficient scope");
    includeMemories = access.readMemories;
    includeProfile = access.readProfile;
  }

  const personality = includeProfile ? await getPersonality(params.userId) : null;
  const system = buildPersonalitySystemPrompt(personality);

  const hits = includeMemories
    ? await searchMemoriesByEmbedding(params.userId, params.userMessage)
    : [];
  const citations: Citation[] = hits.map((h) => ({
    memoryId: h.id,
    relevance: h.similarity,
    excerpt: h.content.slice(0, 280),
    reason: `Semantic similarity ${(h.similarity * 100).toFixed(1)}%`,
  }));

  const context = hits.length
    ? `Relevant memories:\n${hits.map((h, i) => `[${i + 1}] ${h.content}`).join("\n")}`
    : includeMemories
      ? "No relevant memories found."
      : "Memory access is not included in this consent grant. Do not guess personal facts.";

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `${system}\n\nYou must ground answers in the provided memories when relevant and never invent facts about the user. Cite memory indices when used.`,
    messages: [
      { role: "system", content: context },
      { role: "user", content: params.userMessage },
    ],
  });

  return { result, citations };
}
