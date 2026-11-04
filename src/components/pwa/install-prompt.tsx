"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);
    if (localStorage.getItem("dt-install-dismissed") === "1") setDismissed(true);
    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (dismissed || (!deferred && !isIOS)) return null;
  if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    }
  }
  function dismiss() {
    localStorage.setItem("dt-install-dismissed", "1");
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md safe-bottom">
      <div className="rounded-xl border bg-card shadow-lg p-4 flex gap-3 items-start">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install Digital Twin</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isIOS ? "Tap Share → Add to Home Screen for the full-screen app experience." : "Add to your home screen — instant access, no app store."}
          </p>
          <div className="flex gap-2 mt-3">
            {!isIOS && deferred && <Button size="sm" onClick={install}>Install</Button>}
            <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1" aria-label="Dismiss"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
