"use client";

// Wishlist submission confirmation with a gift-box reveal moment.
import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Home, KeyRound, PartyPopper } from "lucide-react";
import { AppCtx } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { GiftBox } from "@/components/gift-box";
import { ChristmasCard } from "@/components/decor";

export default function SubmittedView({ ctx }: { ctx: AppCtx }) {
  const { navigate, event, session } = ctx;
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 py-10">
        <GiftBox size={170} label="Pindutin para i-reveal ang confirmation!" onOpen={() => setRevealed(true)} />
      </div>
    );
  }

  const editHidden = !!event?.submissionsLocked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center"
    >
      <PartyPopper className="h-12 w-12 text-xmas-burgundy" aria-hidden />

      <h1 className="font-heading text-3xl font-bold text-xmas-forest sm:text-4xl">
        Successfully submitted ang wishlist mo!
      </h1>

      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Successfully submitted ang wishlist mo! Hintayin ang announcement ng admin bago magsimula
        ang bunutan.
      </p>

      <ChristmasCard className="w-full p-4 text-left sm:p-6">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-xmas-forest">
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-xmas-gold" aria-hidden />
          <span>
            Puwede mong i-edit ang wishlist mo habang open pa ang submissions. Kapag naka-lock na,
            final na.
          </span>
        </p>
      </ChristmasCard>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button
          onClick={() => navigate("status")}
          className="min-h-11 rounded-lg bg-xmas-forest px-6 font-semibold text-xmas-cream hover:bg-xmas-pine"
        >
          View Status
        </Button>
        {!editHidden && (
          <Button
            variant="outline"
            onClick={() => navigate("wishlist")}
            className="min-h-11 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
          >
            <Gift aria-hidden /> I-edit ang Wishlist
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => navigate("welcome")}
          className="min-h-11 rounded-lg text-xmas-forest hover:bg-accent"
        >
          <Home aria-hidden /> Back to Home
        </Button>
      </div>

      {session && (
        <ChristmasCard className="w-full p-4 text-left sm:p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-xmas-forest">
                Tandaan ang 6-digit PIN mo
              </span>{" "}
              — kasama ng First name at Last name mo, ito ang gagamitin mo sa Home page para
              makita ang Monito/Monita mo pagkatapos ng bunutan!
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("confirmation")}
              className="min-h-11 shrink-0 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
            >
              <KeyRound aria-hidden /> Tingnan ang PIN ko
            </Button>
          </div>
        </ChristmasCard>
      )}
    </motion.div>
  );
}
