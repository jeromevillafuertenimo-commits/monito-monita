"use client";

// "Add to Home screen": registers a tiny service worker (installability only, no caching)
// and shows an install button when the browser offers it. iPhone gets a how-to hint.
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!promptEvent && !isIos) return null;

  const install = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      await promptEvent.userChoice.catch(() => undefined);
      setPromptEvent(null);
      return;
    }
    toast("Sa iPhone: pindutin ang Share (⬆️) sa Safari, tapos “Add to Home Screen”.", { duration: 8000 });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={install}
      className="min-h-11 gap-2 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
    >
      <Download aria-hidden /> I-install bilang app
    </Button>
  );
}
