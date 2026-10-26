"use client";

// Public event status: 3-phase vertical timeline with 15-second auto-refresh.
import { useEffect } from "react";
import { Gift, KeyRound, Sparkles, Star } from "lucide-react";
import { AppCtx } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionTitle, ChristmasCard, BudgetBadge, FellowshipDateBadge } from "@/components/decor";

const BADGE_GREEN = "rounded-full border border-xmas-pine/40 bg-xmas-pine/15 text-xmas-pine";
const BADGE_BURGUNDY = "rounded-full border border-xmas-burgundy/40 bg-xmas-burgundy/15 text-xmas-burgundy";
const BADGE_GOLD = "rounded-full border border-xmas-gold/60 bg-xmas-gold/15 text-[#7a6414]";
const BADGE_MUTED = "rounded-full border border-border bg-muted text-muted-foreground";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export default function StatusView({ ctx }: { ctx: AppCtx }) {
  const { event, refreshEvent, navigate } = ctx;

  useEffect(() => {
    void refreshEvent();
    const id = window.setInterval(() => {
      void refreshEvent();
    }, 15000);
    return () => window.clearInterval(id);
  }, [refreshEvent]);

  const rn = event?.randomizationStatus ?? "not_started";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <SectionTitle icon={<Sparkles className="h-5 w-5 text-xmas-gold" aria-hidden />}>
          Event Status
        </SectionTitle>
        <div>
          <FellowshipDateBadge />
        </div>
        <p className="text-xs text-muted-foreground">
          Auto-refresh ang page na ito tuwing 15 segundos.
        </p>
      </div>

      {!event ? (
        <div className="space-y-4" aria-busy="true" aria-label="Naglo-load ang event status">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <ol className="relative space-y-6 border-l-2 border-xmas-gold/40 pl-7">
          {/* Phase 1 — Registration */}
          <li className="relative">
            <span className="absolute -left-[47px] flex h-9 w-9 items-center justify-center rounded-full border-2 border-xmas-gold bg-xmas-cream text-xmas-forest">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <ChristmasCard className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-bold text-xmas-forest">1. Registration</h3>
                <Badge className={event.registrationOpen ? BADGE_GREEN : BADGE_MUTED}>
                  {event.registrationOpen ? "OPEN 🎉" : "CLOSED"}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pangangailangan ng registration bago makapag-submit ng wishlist.
              </p>
            </ChristmasCard>
          </li>

          {/* Phase 2 — Wishlist submissions */}
          <li className="relative">
            <span className="absolute -left-[47px] flex h-9 w-9 items-center justify-center rounded-full border-2 border-xmas-gold bg-xmas-cream text-xmas-forest">
              <Gift className="h-4 w-4" aria-hidden />
            </span>
            <ChristmasCard className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-bold text-xmas-forest">
                  2. Wishlist Submissions
                </h3>
                <Badge className={event.submissionsLocked ? BADGE_BURGUNDY : BADGE_GREEN}>
                  {event.submissionsLocked ? "LOCKED 🔒" : "OPEN"}
                </Badge>
              </div>
              {event.submissionsLocked ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {event.lockedAt && (
                    <span className="block font-medium text-xmas-burgundy">
                      Na-lock noong {fmtDate(event.lockedAt)}.
                    </span>
                  )}
                  Hindi na puwedeng mag-edit o mag-submit.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Puwede pang mag-submit at mag-edit ng wishlist.
                </p>
              )}
            </ChristmasCard>
          </li>

          {/* Phase 3 — Bunutan & release */}
          <li className="relative">
            <span className="absolute -left-[47px] flex h-9 w-9 items-center justify-center rounded-full border-2 border-xmas-gold bg-xmas-cream text-xmas-gold">
              <Star className="h-4 w-4 fill-xmas-gold" aria-hidden />
            </span>
            <ChristmasCard className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-bold text-xmas-forest">
                  3. Bunutan &amp; Assignment Release
                </h3>
                <Badge
                  className={`${
                    rn === "released" ? BADGE_GREEN : rn === "completed" ? BADGE_GOLD : BADGE_MUTED
                  } whitespace-normal text-center leading-snug`}
                >
                  {rn === "not_started" && "HINDI PA NAGSISIMULA"}
                  {rn === "completed" && "TAPOS NA ANG BUNUTAN — HINDI PA RELEASED"}
                  {rn === "released" && "RELEASED NA! 🎉"}
                </Badge>
              </div>

              {rn === "not_started" && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Hinihintay pa ang admin na i-lock ang submissions at patakbuhin ang bunutan.
                </p>
              )}
              {rn === "completed" && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Tapos na ang randomization. Hintayin ang announcement ng admin!
                </p>
              )}
              {rn === "released" && (
                <div className="mt-2">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Para makita ang wishlist ng na-assign sa iyo, pindutin ang button sa ibaba!
                    {event.releasedAt && (
                      <span className="mt-1 block font-medium text-xmas-pine">
                        Na-release noong {fmtDate(event.releasedAt)}.
                      </span>
                    )}
                  </p>
                  <Button
                    onClick={() => navigate("check")}
                    className="mt-3 min-h-11 rounded-lg bg-xmas-forest font-semibold text-xmas-cream hover:bg-xmas-pine"
                  >
                    <KeyRound aria-hidden /> Check My Monito/Monita
                  </Button>
                </div>
              )}
            </ChristmasCard>
          </li>
        </ol>
      )}

      {/* Bottom hint card */}
      {event && (
        <ChristmasCard className="p-4 sm:p-6">
          <h3 className="font-heading text-base font-bold text-xmas-forest">May tanong o problema?</h3>
          <div className="mt-3">
            <BudgetBadge min={event.budgetMin} max={event.budgetMax} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Nakalimutan ang PIN mo? Pakicontact ang admin — puwede nilang i-reset ito para
            makapag-sign in ka ulit gamit ang pangalan at bagong PIN mo.
          </p>
        </ChristmasCard>
      )}
    </div>
  );
}
