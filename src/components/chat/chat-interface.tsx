"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CitationPanel } from "./citation-panel";
import { ThreadSidebar } from "./thread-sidebar";
import type { Citation } from "@/lib/ai/orchestrator";
import type { ThreadWithPreview } from "@/lib/chat";
import {
  createThreadAction,
  getThreadAction,
  listThreadsAction,
} from "@/app/actions/chat";
import { toast } from "sonner";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export function ChatInterface({
  initialThreads,
}: {
  initialThreads: ThreadWithPreview[];
}) {
  const [threads, setThreads] = useState(initialThreads);
  const [threadId, setThreadId] = useState<string | null>(initialThreads[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    getThreadAction(threadId)
      .then((thread) => {
        if (cancelled || !thread) return;
        setMessages(
          thread.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              citations: m.citations?.map((c) => ({
                memoryId: c.memoryId,
                relevance: c.relevance ?? 0,
                excerpt: c.excerpt ?? "",
                reason: c.reason ?? "",
              })),
            }))
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load conversation");
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const ensureThread = useCallback(async (): Promise<string> => {
    if (threadId) return threadId;
    const thread = await createThreadAction();
    setThreads((prev) => [thread as ThreadWithPreview, ...prev]);
    setThreadId(thread.id);
    return thread.id;
  }, [threadId]);

  async function send() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    setIsStreaming(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: text }]);

    try {
      const activeThreadId = await ensureThread();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, threadId: activeThreadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setMessages((prev) => [
        ...prev,
        {
          id: data.message?.id ?? crypto.randomUUID(),
          role: "assistant",
          content: data.message?.content ?? data.text ?? "",
          citations: data.citations,
        },
      ]);
      if (data.citations) setActiveCitations(data.citations);

      const refreshed = await listThreadsAction();
      setThreads(refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[14rem_1fr_20rem] h-[calc(100vh-11rem)] min-h-[480px]">
      <ThreadSidebar
        threads={threads}
        activeId={threadId}
        onSelect={setThreadId}
        onNew={async () => {
          const thread = await createThreadAction();
          setThreads((prev) => [thread as ThreadWithPreview, ...prev]);
          setThreadId(thread.id);
          setMessages([]);
          setActiveCitations([]);
        }}
      />

      <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted">
              <p className="font-medium text-foreground">Talk to your twin</p>
              <p className="mt-1 max-w-sm text-sm">Answers are grounded in your memories.</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m.content || (isStreaming ? "Thinking…" : "")}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="border-t p-3">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask your twin something…"
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <Button onClick={send} disabled={isStreaming || !input.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>

      <CitationPanel citations={activeCitations} />
    </div>
  );
}
