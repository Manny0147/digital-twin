"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export function ExportVault() {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch("/api/vault/export");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename=\"(.+)\"/)?.[1] ?? "digital-twin-vault.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Vault downloaded — this file is yours");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Export your vault</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Download every memory, your personality profile, grants, recent conversations, and audit log as a single JSON file. This is your data — portable, complete, and under your control.
          </p>
        </div>
      </div>
      <Button onClick={download} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {loading ? "Preparing export…" : "Download vault JSON"}
      </Button>
    </div>
  );
}
