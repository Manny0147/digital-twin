import { prisma } from "./db";
import { decryptText, isEncryptedPayload } from "./crypto";
import type { VaultExport } from "./vault";

const ENC_PREFIX = "__enc__:";

export async function importVault(params: {
  userId: string;
  vault: VaultExport;
  passphrase?: string;
}) {
  const { userId, vault, passphrase } = params;

  for (const m of vault.memories) {
    let content = m.content;
    let isEncrypted = m.isEncrypted;

    if (m.isEncrypted && m.content.startsWith(ENC_PREFIX)) {
      if (!passphrase) {
        throw new Error("Passphrase required to import encrypted memories");
      }
      const payload = m.content.slice(ENC_PREFIX.length);
      try {
        content = await decryptText(payload, passphrase);
        // Re-encrypt with the same passphrase so the ciphertext is portable
        content = ENC_PREFIX + (await (await import("./crypto")).encryptText(content, passphrase));
        isEncrypted = true;
      } catch {
        throw new Error("Failed to decrypt encrypted memory during import. Check the passphrase.");
      }
    }

    await prisma.memory.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        userId,
        content,
        type: m.type as never,
        source: m.source as never,
        status: m.status as never,
        isEncrypted,
        tags: m.tags,
        confidence: m.confidence,
        importance: m.importance,
        metadata: m.metadata as object,
      },
      update: {
        content,
        isEncrypted,
        tags: m.tags,
        confidence: m.confidence,
        importance: m.importance,
        metadata: m.metadata as object,
      },
    });
  }

  return { imported: vault.memories.length };
}
