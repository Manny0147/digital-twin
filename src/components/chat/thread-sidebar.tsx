"use client";

import { Button } from "@/components/ui/button";
import type { ThreadWithPreview } from "@/lib/chat";

export function ThreadSidebar({
  threads,
  activeId,
  onSelect,
  onNew,
}: {
  threads: ThreadWithPreview[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-r border-border bg-card/50">
      <div className="p-3">
        <Button size="sm" className="w-full" onClick={onNew}>
          New chat
        </Button>
      </div>
      <ul className="flex-1 overflow-y-auto px-2 pb-4">
        {threads.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => onSelect(t.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                activeId === t.id ? "bg-primary/10 text-foreground" : "text-muted hover:bg-card"
              }`}
            >
              <div className="truncate font-medium">{t.title || "Untitled"}</div>
              <div className="truncate text-xs opacity-70">
                {t.messages?.[0]?.content?.slice(0, 60) || "No messages"}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
