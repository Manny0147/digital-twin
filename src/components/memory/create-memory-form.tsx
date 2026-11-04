"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createMemoryAction } from "@/app/actions/memories";

export function CreateMemoryForm() {
  const [content, setContent] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await createMemoryAction({
          content,
          sensitive,
          passphrase: sensitive ? passphrase : undefined,
        });
        setContent("");
        setPassphrase("");
        setSensitive(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={4}
        placeholder="What should your twin remember?"
        className="w-full rounded-md border border-border bg-background p-3 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sensitive}
          onChange={(e) => setSensitive(e.target.checked)}
        />
        Sensitive (encrypt with passphrase)
      </label>
      {sensitive && (
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          minLength={8}
          required
          placeholder="Passphrase (min 8 chars)"
          className="w-full rounded-md border border-border bg-background p-2 text-sm"
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save memory"}
      </Button>
    </form>
  );
}
