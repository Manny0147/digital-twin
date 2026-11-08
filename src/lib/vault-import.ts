import { prisma } from "./db";
import { decryptText } from "./crypto";
import { assertWithinLimit, limiters } from "./rate-limit";
import type { VaultExport } from "./vault";

const ENC_PREFIX = "__enc__:";

/** Never update a memory owned by someone else, even if the vault reuses its id. */
export function memoryImportAction(
  existingOwnerId: string | null,
  importerId: string
): "create" | "update" | "copy" {
  if (existingOwnerId === null) return "create";
  if (existingOwnerId === importerId) return "update";
  return "copy";
}

export async function importVault(params: {
  userId: string;
  vault: VaultExport;
  passphrase?: string;
}) {
  const { userId, vault, passphrase } = params;
  await assertWithinLimit(limiters.memory, userId);

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

    const data = {
      content,
      type: m.type as never,
      source: m.source as never,
      status: m.status as never,
      isEncrypted,
      tags: m.tags,
      confidence: m.confidence,
      importance: m.importance,
      metadata: m.metadata as object,
    };
    const existing = await prisma.memory.findUnique({
      where: { id: m.id },
      select: { userId: true },
    });
    const action = memoryImportAction(existing?.userId ?? null, userId);
    if (action === "update") {
      await prisma.memory.update({ where: { id: m.id }, data });
    } else if (action === "create") {
      await prisma.memory.create({ data: { id: m.id, userId, ...data } });
    } else {
      await prisma.memory.create({ data: { userId, ...data } });
    }
  }

  return { imported: vault.memories.length };
}
