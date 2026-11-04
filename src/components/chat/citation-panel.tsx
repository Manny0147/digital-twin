"use client";

import type { Citation } from "@/lib/ai/orchestrator";

export function CitationPanel({
  citations,
}: {
  citations: Citation[];
}) {
  if (!citations.length) return null;
  return (
    <aside className="space-y-2 rounded-lg border border-border bg-card p-3 text-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Sources</h3>
      <ul className="space-y-2">
        {citations.map((c, i) => (
          <li key={c.memoryId + i} className="rounded border border-border/60 p-2">
            <div className="text-xs text-muted">{c.reason}</div>
            <p className="mt-1 line-clamp-3">{c.excerpt}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
