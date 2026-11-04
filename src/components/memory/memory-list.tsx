"use client";

import { Memory } from "@prisma/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MemoryList({ memories }: { memories: Memory[] }) {
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});

  async function unlock(id: string) {
    const passphrase = window.prompt("Passphrase to unlock this memory");
    if (!passphrase) return;
    const res = await fetch("/api/mobile/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memoryId: id, passphrase, action: "decrypt" }),
    });
    if (!res.ok) {
      alert("Could not decrypt");
      return;
    }
    const data = await res.json();
    setUnlocked((s) => ({ ...s, [id]: data.content ?? data.plaintext }));
  }

  return (
    <ul className="space-y-3">
      {memories.map((m) => (
        <li key={m.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{m.type}</span>
            <span>importance {m.importance}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {m.isEncrypted
              ? unlocked[m.id] ?? "[encrypted — unlock to view]"
              : m.content}
          </p>
          {m.isEncrypted && !unlocked[m.id] && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => unlock(m.id)}>
              Unlock
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
