"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Meta = {
  ownerName: string;
  purpose: string;
  scopes: string[];
  expiresAt: string | null;
  granteeLabel: string | null;
  canChat: boolean;
};

type Msg = { id: string; role: "user" | "assistant"; content: string };

export function PublicTwinChat({ token }: { token: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/public/twin?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Invalid link");
        setMeta(data);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming || meta?.canChat === false) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: text }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/public/twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: data.text ?? "" },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setStreaming(false);
    }
  }

  const canChat = meta?.canChat !== false;

  if (error && !meta) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <h1 className="text-lg font-semibold">This link is not available</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!meta) {
    return <div className="py-24 text-center text-muted">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h1 className="text-xl font-semibold">{meta.ownerName}&rsquo;s digital twin</h1>
        <p className="mt-1 text-sm text-muted">Purpose: {meta.purpose}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {meta.scopes.map((s) => (
            <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
              {s}
            </span>
          ))}
        </div>
        {meta.expiresAt && (
          <p className="mt-3 text-xs text-muted">
            Expires {new Date(meta.expiresAt).toLocaleString()}
          </p>
        )}
        {!canChat && (
          <p className="mt-3 text-sm text-muted" role="status">
            This link does not currently allow chat.
          </p>
        )}
      </div>

      <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border bg-card">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="py-16 text-center text-sm text-muted">
              Ask something the owner has allowed this twin to answer.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="border-t p-3">
          {error && (
            <p className="mb-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="twin-message">
              Message
            </label>
            <input
              id="twin-message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask the twin…"
              disabled={streaming || !canChat}
              aria-busy={streaming}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <Button onClick={send} disabled={streaming || !canChat || !input.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
