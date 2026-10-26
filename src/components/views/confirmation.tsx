"use client";

// Post-registration confirmation: shows the participant's 6-digit PIN and
// reminds them that signing back in = First name + Last name + this PIN.
// No more private access links — the name + PIN combo is the only key.
import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, PartyPopper, Star, UserRound } from "lucide-react";
import { AppCtx } from "@/lib/app-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChristmasCard } from "@/components/decor";

export default function ConfirmationView({ ctx }: { ctx: AppCtx }) {
  const { navigate, session } = ctx;
  const [copiedPin, setCopiedPin] = useState(false);

  useEffect(() => {
    if (!session) navigate("register");
  }, [session, navigate]);

  if (!session) return null;

  const pin = session.pin ?? "";

  const copyText = async (
    value: string,
    onOk: () => void,
    okMsg: string,
    failMsg: string
  ): Promise<void> => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // Fallback for browsers/contexts without the async clipboard API.
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      onOk();
      toast.success(okMsg);
    } else {
      toast.error(failMsg);
    }
  };

  const copyPin = () =>
    void copyText(
      pin,
      () => {
        setCopiedPin(true);
        window.setTimeout(() => setCopiedPin(false), 2000);
      },
      "Nakopya na ang PIN mo! I-save o i-memorize ito. 🔑",
      "Hindi makopya ang PIN. Pakicopy na lang manually."
    );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <div className="flex items-center gap-3" aria-hidden>
        <Star className="h-10 w-10 fill-xmas-gold text-xmas-gold" />
        <PartyPopper className="h-10 w-10 text-xmas-burgundy" />
      </div>

      <h1 className="font-heading text-3xl font-bold text-xmas-forest sm:text-4xl">
        Registration Successful! 🎉
      </h1>

      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Successfully registered ka na,{" "}
        <span className="font-bold text-xmas-forest">{session.identityCode}</span>! Para makabalik
        ka, mag-<span className="font-semibold text-xmas-forest">sign in</span> gamit ang{" "}
        <span className="font-semibold text-xmas-forest">First name mo</span>,{" "}
        <span className="font-semibold text-xmas-forest">Last name mo</span>, at ang{" "}
        <span className="font-semibold text-xmas-forest">6-digit PIN mo</span> sa ibaba.
      </p>

      {/* Sign-in credentials summary */}
      <ChristmasCard className="w-full p-4 text-left sm:p-6">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-xmas-forest">
          <UserRound className="h-5 w-5 text-xmas-gold" aria-hidden /> Ang sign-in mo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ito ang tatlong gagamitin mo sa Home page para makita ang Monito/Monita mo pagkatapos ng
          official bunutan.
        </p>
        <div className="mt-3 grid gap-2 rounded-lg border border-xmas-pine/30 bg-xmas-pine/5 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              First name
            </p>
            <p className="font-semibold text-xmas-forest">{session.firstName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last name
            </p>
            <p className="font-semibold text-xmas-forest">{session.lastName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Identity code
            </p>
            <p className="font-semibold text-xmas-forest">{session.identityCode}</p>
          </div>
        </div>
      </ChristmasCard>

      {/* PIN box (primary) */}
      <ChristmasCard className="w-full border-xmas-gold/60 p-4 text-left sm:p-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-xmas-forest">
          <KeyRound className="h-5 w-5 text-xmas-gold" aria-hidden /> Ang iyong 6-digit PIN
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kasama ng pangalan mo, ito ang sikreto mo para makabalik. I memorize o isulat ito ngayon!
        </p>
        <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p
            className="rounded-lg border border-xmas-gold bg-xmas-gold/10 px-6 py-3 font-mono text-3xl font-bold tracking-[0.35em] text-xmas-forest sm:text-4xl"
            aria-label={`Ang PIN mo ay ${pin.split("").join(" ")}`}
          >
            {pin || "••••••"}
          </p>
          <Button
            type="button"
            onClick={copyPin}
            aria-label="Kopyahin ang 6-digit PIN"
            className="min-h-11 w-full rounded-lg bg-xmas-forest text-xmas-cream hover:bg-xmas-pine sm:w-auto"
          >
            {copiedPin ? <Check aria-hidden /> : <Copy aria-hidden />}{" "}
            {copiedPin ? "Nakopya!" : "Copy ang PIN"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Hindi namin ipapakita ulit ang PIN na ito — kaya siguradong tatandaan mo ha! 🔑
        </p>
      </ChristmasCard>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button
          onClick={() => navigate("wishlist")}
          className="min-h-12 rounded-lg bg-xmas-forest px-6 text-base font-semibold text-xmas-cream hover:bg-xmas-pine"
        >
          Proceed sa Wishlist 🎁
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("status")}
          className="min-h-11 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
        >
          View Status
        </Button>
      </div>
    </div>
  );
}
