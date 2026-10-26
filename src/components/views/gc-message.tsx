"use client";

// GC Message view — a ready-to-paste Taglish announcement for the organizer's
// Facebook Messenger group chat: short intro about the system, the simplest
// procedure for participants, and FAQs. One tap copies the whole message.
// Contract: default export GcMessageView({ ctx }: { ctx?: AppCtx }).

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Pin, Send, Sparkles } from "lucide-react";
import { AppCtx } from "@/lib/app-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionTitle, ChristmasCard, FellowshipDateBadge } from "@/components/decor";
import { FELLOWSHIP_DATE } from "@/lib/event-config";

function buildMessage(o: {
  siteUrl: string;
  eventName: string;
  budgetMin: number;
  budgetMax: number;
}): string {
  const link = o.siteUrl || "(i-open ang website ng Monito-Monita)";
  return `🎄🎁 MONITO–MONITA 2026 — OFFICIAL SYSTEM NATIN! 🎁🎄

Hello, mga kapatid! 👋
Para maayos at mas madali ang ating ${o.eventName} ngayong ${FELLOWSHIP_DATE}, may simple tayong website na gagamitin.

Sa website na ito:
✅ Ikaw mismo ang magre-register
✅ Ikaw ang maglalagay ng wishlist mo (₱${o.budgetMin}–₱${o.budgetMax} lang ang budget)
✅ Ikaw ang makakakita kung sino ang bibigyan mo — secret at safe! 🤫

━━━━━━━━━━━━━━━━━━
📌 PAANO SUMALI — 3 SIMPLE STEPS
━━━━━━━━━━━━━━━━━━

1️⃣ MAG-REGISTER
I-open ang link na ito 👇
${link}
Pindutin ang gift box o ang "Register" button, tapos fill-out-an ang:
  • First name mo at Last name mo
  • Sex: Babae o Lalaki
  • Secret identity code mo (color + word, hal. "Emerald Hawk" o "Ruby Tulip")
  • 6-digit PIN mo — ito ang password mo sa website. Isulat ito at HUWAG KALIMUTAN! ✍️

2️⃣ MAGLAGAY NG WISHLIST
Pagkatapos mag-register, isulat ang hanggang 3 wish items mo (₱${o.budgetMin}–₱${o.budgetMax} ang budget).
Tip: mga practical na bagay na talagang gusto mo — para madaling hanapin ng Monito/Monita mo. 😊
Puwede mo ring i-edit ito anumang oras: sign in lang ulit gamit ang name + PIN mo.

3️⃣ HINTAYIN ANG BUNUTAN 🎁
Kapag inanunsyo na sa GC na released na ang bunutan:
  • I-open ulit ang website
  • I-type ang First name, Last name, at 6-digit PIN mo
  • Pindutin ang "Check My Monito/Monita"
  • Makikita mo kung SINO ang bibigyan mo at ano ang WISHLIST niya!

Tapos? Bumili na ng regalo at ihanda para sa ${FELLOWSHIP_DATE}. 🎄

━━━━━━━━━━━━━━━━━━
❓ MGA TANONG (FAQ)
━━━━━━━━━━━━━━━━━━

Q: Nakalimutan ko ang PIN ko! 😅
A: Walang problema — i-message lang ang admin dito sa GC para ma-reset ito.

Q: Nawala ko ang website link.
A: I-pin 📌 ang message na ito sa GC para hindi mawala, o i-message ang admin.

Q: Pwede bang palitan ang wishlist ko?
A: Oo! Hangga't hindi pa naka-lock ng admin, sign in lang gamit ang name + PIN mo tapos i-edit ang wishlist mo.

Q: Makikita ba ng ibang tao ang wishlist ko?
A: Hindi. Ang tao lang na nakabunot sa iyo ang makakakita ng wishlist mo, at ang admin lang ang nakakakita ng lahat. 🤫

Q: Bakit may 6-digit PIN?
A: Para ikaw lang talaga ang makapasok sa account mo at makakita ng assignment mo. Kaya huwag i-share ang PIN mo, ha!

Q: Bakit ₱${o.budgetMin}–₱${o.budgetMax} lang?
A: Para pantay-pantay tayong lahat at walang mabigatan sa bulsa. 🙏

Kung may tanong pa, i-message lang ang admin dito sa GC.
Salamat, mga kapatid — maligayang Pasko! 🙏✨`;
}

export default function GcMessageView({ ctx }: { ctx?: AppCtx }) {
  const event = ctx?.event ?? null;
  // The website link inside the message is auto-generated from this very
  // site's URL, so whatever link the organizer copies is always correct.
  // Lazy init avoids setState-in-effect; this view only renders client-side
  // (after the app's boot gate), so window is always available here.
  const [siteUrl] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : ""
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void ctx?.refreshEvent?.();
  }, []);

  const eventName = event?.eventName ?? "Christmas Exchange Gift";
  const budgetMin = event?.budgetMin ?? 150;
  const budgetMax = event?.budgetMax ?? 200;

  const message = useMemo(
    () => buildMessage({ siteUrl, eventName, budgetMin, budgetMax }),
    [siteUrl, eventName, budgetMin, budgetMax]
  );

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        // Fallback for older browsers / non-secure contexts
        const ta = document.createElement("textarea");
        ta.value = message;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Na-copy na ang buong message! 📋 I-paste na sa Messenger GC natin.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Hindi na-copy. Paki-select na lang ang text sa kahon at i-copy manually.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <SectionTitle icon={<Send className="h-5 w-5 text-xmas-forest" aria-hidden />}>
          GC Post para sa Messenger
        </SectionTitle>
        <div>
          <FellowshipDateBadge />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Handa nang i-paste sa Facebook Messenger group chat! Taglish na, may intro, procedure, at
          FAQs na — kopyahin lang at i-send. 🎄
        </p>
      </div>

      {/* How to use */}
      <ChristmasCard className="p-4 sm:p-6">
        <SectionTitle
          className="mb-3"
          icon={<Sparkles className="h-5 w-5 text-xmas-gold" aria-hidden />}
        >
          Paano gamitin?
        </SectionTitle>
        <ol className="space-y-2.5">
          {[
            "Pindutin ang malaking green button sa ibaba para i-copy ang buong message.",
            "I-paste sa Facebook Messenger group chat natin bilang isang message.",
            "I-pin 📌 ang message sa GC para hindi mawala sa mga kapatid.",
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-xmas-gold font-heading text-xs font-bold text-xmas-forest">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{t}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          Ang website link sa message ay <span className="font-semibold">awtomatikong tama</span> —
          galing ito mismo sa website na ito, kaya hindi mo na kailangang baguhin. Gusto mong may
          dagdag o tanggal? I-edit mo lang after i-paste sa Messenger draft.
        </p>
      </ChristmasCard>

      {/* Message preview + copy */}
      <ChristmasCard className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-base font-bold text-xmas-forest">
            Preview ng message
          </h3>
          <Badge className="border-xmas-pine/40 bg-xmas-pine/15 text-xmas-pine">Taglish</Badge>
        </div>
        <div
          aria-label="Message na ikokopya sa GC"
          className="nice-scroll mt-3 max-h-[440px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground sm:p-5"
        >
          {message}
        </div>
        <Button
          onClick={handleCopy}
          className="mt-4 min-h-11 w-full rounded-lg bg-xmas-forest text-base font-semibold text-xmas-cream hover:bg-xmas-pine"
        >
          {copied ? (
            <>
              <Check className="h-5 w-5" aria-hidden /> Na-copy na! ✅
            </>
          ) : (
            <>
              <Copy className="h-5 w-5" aria-hidden /> I-copy ang buong message
            </>
          )}
        </Button>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-xmas-gold" aria-hidden />
          Tip: pagkatapos i-send, pindutin nang matagal ang message sa Messenger at piliin ang
          &quot;Pin&quot; para nasa taas lagi ng GC.
        </p>
      </ChristmasCard>
    </div>
  );
}
