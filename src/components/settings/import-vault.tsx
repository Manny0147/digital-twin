"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImportVault() {
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setPending(true);
    setStatus(null);
    try {
      const text = await file.text();
      const vault = JSON.parse(text);
      const res = await fetch("/api/vault/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault, passphrase: passphrase || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setStatus(`Imported ${data.imported ?? 0} memories.`);
      setFile(null);
      setPassphrase("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-medium">Import vault</h3>
      <input
        type="file"
        accept="application/json"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <input
        type="password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        placeholder="Passphrase (if vault has encrypted memories)"
        className="w-full rounded-md border border-border bg-background p-2 text-sm"
      />
      <Button type="submit" disabled={!file || pending}>
        {pending ? "Importing…" : "Import"}
      </Button>
      {status && <p className="text-sm text-muted">{status}</p>}
    </form>
  );
}
