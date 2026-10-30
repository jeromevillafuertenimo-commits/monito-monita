"use client";

// My assignment reveal: shows the assigned Monito/Monita code + their wishlist.
// NEVER shows real names — identity codes only.
//
// "Log Out" (not "Back to Home"): after the bunutan, the home page is a
// sign-in window (First name + Last name + 6-digit PIN). Logging out clears
// the session (client + server) so the details are never retained on
// refresh — every visit asks for the name + PIN again.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, CalendarDays, Gift, KeyRound, Loader2, LogOut } from "lucide-react";
import { AppCtx } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChristmasCard, BudgetBadge } from "@/components/decor";
import { Confetti } from "@/components/confetti";
import { Checkbox } from "@/components/ui/checkbox";
import { lsGetJson, lsSetJson } from "@/lib/device-store";
import { FELLOWSHIP_DATE } from "@/lib/event-config";

export default function MyAssignmentView({ ctx }: { ctx: AppCtx }) {
  const { navigate, assignment, session, event, setSession, setAssignment } = ctx;
  const [loggedOut, setLoggedOut] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Giver's checklist: which wishes I have already bought (saved on this phone only).
  const checklistKey = assignment ? `mm-checklist:${assignment.recipientCode}` : null;
  const [bought, setBought] = useState<number[]>([]);
  useEffect(() => {
    if (!checklistKey) return;
    const saved = lsGetJson<number[]>(checklistKey);
    setBought(Array.isArray(saved) ? saved.filter((n) => Number.isInteger(n)) : []);
  }, [checklistKey]);
  const toggleBought = (i: number) => {
    setBought((prev) => {
      const next = prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i];
      if (checklistKey) lsSetJson(checklistKey, next);
      return next;
    });
  };

  useEffect(() => {
    if (loggedOut) return; // already leaving — don't bounce the user around
    if (!assignment || !session) navigate("check");
  }, [assignment, session, navigate, loggedOut]);

  if (!assignment || !session) return null;

  const budgetMin = event?.budgetMin ?? 150;
  const budgetMax = event?.budgetMax ?? 200;

  /**
   * Log Out: invalidates the session server-side, clears everything on this
   * device, and returns to the Home sign-in screen.
   */
  const handleLogout = async () => {
    if (loggingOut || loggedOut) return;
    setLoggingOut(true);
    setLoggedOut(true);
    try {
      // Best-effort server invalidation; the client clears regardless.
      await apiJson("/api/logout", { method: "POST", token: session.token }).catch(
        () => undefined
      );
    } finally {
      setAssignment(null);
      setSession(null); // also removes the saved session from this device
      toast.success("Naka-log out na. 👋 I-type lang muli ang PIN mo sa Home kapag babalik ka.");
      navigate("welcome");
    }
  };

  return (
    <>
    <Confetti />
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto w-full max-w-2xl space-y-6"
    >
      {/* Recipient reveal */}
      <ChristmasCard className="p-4 text-center sm:p-6">
        <div className="flex items-center justify-center gap-2">
          <Gift className="h-6 w-6 text-xmas-burgundy" aria-hidden />
          <h2 className="font-heading text-2xl font-bold text-xmas-forest sm:text-3xl">
            Congratulations! 🎉
          </h2>
        </div>
        <p className="mt-5 text-base text-muted-foreground sm:text-lg">Ang Monito/Monita mo ay si</p>
        <p className="gold-shimmer mt-1 font-heading text-4xl font-bold sm:text-5xl">
          {assignment.recipientCode}
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Ikaw ang magbibigay ng regalo kay{" "}
          <span className="font-semibold text-xmas-forest">{assignment.recipientCode}</span>. Keep it
          secret, ha! 🤫
        </p>
      </ChristmasCard>

      {/* Wishlist */}
      <ChristmasCard className="p-4 sm:p-6">
        <h3 className="font-heading text-lg font-bold text-xmas-forest sm:text-xl">
          Wishlist ni {assignment.recipientCode}
        </h3>
        <ol className="mt-4 space-y-4">
          {assignment.wishes.map((w, i) => (
            <li key={`${w.name}-${i}`} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-xmas-gold font-heading text-sm font-bold text-xmas-forest">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-base font-semibold text-xmas-forest sm:text-lg ${bought.includes(i) ? "line-through opacity-60" : ""}`}>{w.name}</p>
                {w.details && (
                  <p className="break-words text-sm text-muted-foreground sm:text-base">{w.details}</p>
                )}
              </div>
              <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Checkbox
                  checked={bought.includes(i)}
                  onCheckedChange={() => toggleBought(i)}
                  aria-label={`Nabili ko na: ${w.name}`}
                />
                Nabili na
              </label>
            </li>
          ))}
          {assignment.wishes.length === 0 && (
            <li className="text-sm text-muted-foreground sm:text-base">
              Walang nakalistang wishes — pumili ka na lang ng bagay na bagay sa kanya within the
              budget. 😊
            </li>
          )}
        </ol>

        <div className="mt-5 rounded-lg border border-xmas-gold/60 bg-xmas-gold/10 p-3 text-sm font-medium text-[#7a6414] sm:text-base" role="note">
          Reminder: Keep your gift within the ₱{budgetMin}–₱{budgetMax} budget. 🎁
        </div>
        <div
          className="mt-3 flex items-start gap-2 rounded-lg border border-xmas-pine/40 bg-xmas-pine/10 p-3 text-sm font-medium text-xmas-pine sm:text-base"
          role="note"
        >
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Ihanda ang gift mo para sa <span className="font-bold">Christmas Fellowship — {FELLOWSHIP_DATE}</span>! Doon natin ibibigay ang mga regalo. 🎄
          </span>
        </div>
        <div className="mt-3">
          <BudgetBadge min={budgetMin} max={budgetMax} />
        </div>
      </ChristmasCard>

      {/* How to come back */}
      <ChristmasCard className="w-full p-4 text-left sm:p-6">
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-xmas-forest sm:text-base">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-xmas-gold" aria-hidden />
            <span>
              <span className="font-semibold">Para makabalik:</span> pumunta lang sa{" "}
              <span className="font-semibold">Home</span> at mag-<span className="font-semibold">sign in</span>{" "}
              gamit ang <span className="font-semibold">First name mo</span>,{" "}
              <span className="font-semibold">Last name mo</span>, at ang{" "}
              <span className="font-semibold">6-digit PIN</span> mo. Laging hihingin ang mga ito —
              kahit mag-refresh o magsara ang browser — para laging protektado ang secret na ito.
              🔐
            </span>
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Nakalimutan ang PIN? Humingi ng tulong sa admin — puwede nilang i-reset ang PIN mo
            para makapag-sign in ka ulit gamit ang pangalan at bagong PIN.
          </p>
        </div>
      </ChristmasCard>

      {/* Actions — Log Out is the primary exit so nothing is retained on refresh */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleLogout}
          disabled={loggingOut}
          className="min-h-12 flex-1 rounded-lg bg-xmas-forest text-base font-semibold text-xmas-cream hover:bg-xmas-pine"
        >
          {loggingOut ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <LogOut aria-hidden />
          )}
          Log Out
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("status")}
          className="min-h-12 rounded-lg border-xmas-forest/30 text-base text-xmas-forest hover:bg-accent"
        >
          <Bell aria-hidden /> View Status
        </Button>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Keep it secret hanggang sa araw ng gift exchange! 🤫
      </p>
    </motion.div>
    </>
  );
}
