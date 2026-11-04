import { prisma } from "./db";
import { z } from "zod";

export const PersonalitySchema = z.object({
  traits: z.record(z.number().min(0).max(1)).optional(),
  speakingStyle: z.string().max(2000).optional().nullable(),
  values: z.array(z.string().max(100)).max(20).optional(),
  avoidTopics: z.array(z.string().max(100)).max(20).optional(),
  preferredTone: z.string().max(100).optional().nullable(),
});

export type PersonalityInput = z.infer<typeof PersonalitySchema>;

export async function upsertPersonality(userId: string, input: PersonalityInput) {
  const parsed = PersonalitySchema.parse(input);
  return prisma.personalityProfile.upsert({
    where: { userId },
    create: {
      userId,
      traits: parsed.traits ?? {},
      speakingStyle: parsed.speakingStyle ?? null,
      values: parsed.values ?? [],
      avoidTopics: parsed.avoidTopics ?? [],
      preferredTone: parsed.preferredTone ?? null,
    },
    update: {
      traits: parsed.traits ?? undefined,
      speakingStyle: parsed.speakingStyle ?? undefined,
      values: parsed.values ?? undefined,
      avoidTopics: parsed.avoidTopics ?? undefined,
      preferredTone: parsed.preferredTone ?? undefined,
    },
  });
}

export async function getPersonality(userId: string) {
  return prisma.personalityProfile.findUnique({ where: { userId } });
}

export function buildPersonalitySystemPrompt(profile: {
  traits?: unknown;
  speakingStyle?: string | null;
  values?: string[];
  avoidTopics?: string[];
  preferredTone?: string | null;
} | null): string {
  if (!profile) return "You are a helpful personal digital twin.";
  const parts = ["You are the user's personal digital twin."];
  if (profile.preferredTone) parts.push(`Preferred tone: ${profile.preferredTone}.`);
  if (profile.speakingStyle) parts.push(`Speaking style: ${profile.speakingStyle}`);
  if (profile.values?.length) parts.push(`Values: ${profile.values.join(", ")}.`);
  if (profile.avoidTopics?.length) parts.push(`Avoid topics: ${profile.avoidTopics.join(", ")}.`);
  return parts.join(" ");
}
