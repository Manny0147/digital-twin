import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[embeddings] OPENAI_API_KEY missing — skipping");
    return null;
  }
  try {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text.slice(0, 8000),
    });
    return embedding;
  } catch (err) {
    console.error("[embeddings] failed:", err);
    return null;
  }
}

export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
