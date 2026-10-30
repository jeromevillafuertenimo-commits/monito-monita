"use client";

// One-tap share of the app link (native share sheet, e.g. Messenger/Viber), with copy fallback.
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, url.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function ShareButtons({ eventName }: { eventName?: string }) {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const copy = async () => {
    const ok = await copyLink(url);
    toast[ok ? "success" : "error"](ok ? "Nakopya ang link! I-paste sa group chat. 🎄" : "Hindi makopya. Pakicopy ang link sa address bar.");
  };
  const share = async () => {
    const data = {
      title: "Monito-Monita",
      text: `${eventName ?? "Christmas Exchange Gift"} — mag-register na dito:`,
      url,
    };
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // user closed the sheet
      }
    }
    await copy();
  };
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button type="button" variant="outline" onClick={share} className="min-h-11 gap-2 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent">
        <Share2 aria-hidden /> I-share ang link
      </Button>
      <Button type="button" variant="ghost" onClick={copy} className="min-h-11 gap-2 rounded-lg text-xmas-forest hover:bg-accent">
        <Copy aria-hidden /> Copy link
      </Button>
    </div>
  );
}
