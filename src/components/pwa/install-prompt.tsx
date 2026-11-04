"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
      <p className="text-sm">Install Digital Twin for a native-like experience.</p>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
          }}
        >
          Install
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          Not now
        </Button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
