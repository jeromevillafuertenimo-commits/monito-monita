"use client";

// Check My Monito/Monita — participant sign in with First name + Last name +
// their personal 6-digit PIN. (Private access links were removed — name+PIN
// is the only way in.)
//
// UX rules for non-techy users:
// 1. BEFORE the admin releases the bunutan results, this page must never look
//    dead: it shows a live waiting panel with the current event phase,
//    auto-refreshes every 15 seconds, and embeds the sign-in card so a
//    returning participant can get back in (and back to their wishlist)
//    without going anywhere else.
// 2. ONCE released, participants sign in to reveal their assignment. If they
//    already have a live session (signed in while waiting), their assignment
//    is resolved automatically — no typing the PIN all over again.
import { useEffect, useState } from "react";
import {
  Bell,
  Clock,
  Gift,
  Home,
  Hourglass,
  Loader2,
  Lock,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppCtx, AssignmentResult, EventStatus } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import SignInCard, { SignInResult } from "@/components/sign-in-card";
import { GiftBox } from "@/components/gift-box";
import { SectionTitle, ChristmasCard } from "@/components/decor";

interface MeWithAssignment {
  identityCode: string;
  released: boolean;
  assignment: AssignmentResult | null;
}

const BADGE_GREEN = "rounded-full border border-xmas-pine/40 bg-xmas-pine/15 text-xmas-pine";
const BADGE_BURGUNDY = "rounded-full border border-xmas-burgundy/40 bg-xmas-burgundy/15 text-xmas-burgundy";
const BADGE_GOLD = "rounded-full border border-xmas-gold/60 bg-xmas-gold/15 text-[#7a6414]";
const BADGE_MUTED = "rounded-full border border-border bg-muted text-muted-foreground";

function StatusChips({ event }: { event: EventStatus }) {
  const rn = event.randomizationStatus;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Kasalukuyang event status">
      <Badge className={event.registrationOpen ? BADGE_GREEN : BADGE_MUTED}>
        Registration: {event.registrationOpen ? "OPEN" : "CLOSED"}
      </Badge>
      <Badge className={event.submissionsLocked ? BADGE_BURGUNDY : BADGE_GREEN}>
        Submissions: {event.submissionsLocked ? "LOCKED 🔒" : "OPEN"}
      </Badge>
      <Badge className={rn === "released" ? BADGE_GREEN : rn === "completed" ? BADGE_GOLD : BADGE_MUTED}>
        Bunutan:{" "}
        {rn === "not_started"
          ? "hindi pa nagsisimula"
          : rn === "completed"
            ? "tapos na (hindi pa released)"
            : "RELEASED 🎉"}
      </Badge>
      {typeof event.participantCount === "number" && (
        <Badge variant="outline" className="rounded-full">
          👥 {event.participantCount} registered
        </Badge>
      )}
    </div>
  );
}

/** Live waiting panel — shown BEFORE the admin releases the bunutan results. */
function WaitingPanel({
  event,
  hasSession,
  navigate,
  onSignIn,
}: {
  event: EventStatus;
  hasSession: boolean;
  navigate: AppCtx["navigate"];
  onSignIn?: (data: SignInResult) => void;
}) {
  const rn = event.randomizationStatus;

  const phase =
    rn === "completed"
      ? {
          icon: <Sparkles className="h-7 w-7 text-xmas-gold" aria-hidden />,
          title: "Tapos na ang bunutan! 🎉",
          msg: "Hinihintay na lang ni admin i-release ang mga results. Malapit na — balik-balik ka dito!",
        }
      : event.submissionsLocked
        ? {
            icon: <Lock className="h-7 w-7 text-xmas-burgundy" aria-hidden />,
            title: "Naka-lock na ang submissions 🔒",
            msg: "Sarado na ang wishlist submissions at hinihintay na lang ng admin na patakbuhin ang official bunutan.",
          }
        : {
            icon: <Hourglass className="h-7 w-7 text-xmas-gold" aria-hidden />,
            title: "Hindi pa nagsisimula ang bunutan",
            msg: "Hinihintay pa ng admin na i-lock ang mga wishlist submissions at patakbuhin ang official bunutan. Sa ngayon, wala pang Monito/Monita na maibibigay — pero huwag mag-alala, dito ito lalabas pagdating ng release!",
          };

  return (
    <div className="space-y-6">
      <ChristmasCard className="p-4 text-center sm:p-6">
        <div className="mx-auto flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-xmas-gold/15">
            {phase.icon}
          </span>
          <h2 className="font-heading text-xl font-bold text-xmas-forest">{phase.title}</h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{phase.msg}</p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <StatusChips event={event} />
          </div>

          {/* Auto-refresh heartbeat — the page feels alive and updates itself. */}
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-xmas-gold" aria-hidden />
            Kusang nag-che-check tuwing 15 segundos — kapag na-release na, lalabas agad dito ang
            Monito/Monita mo.
          </p>

          {/* Always give the user something to do next. */}
          <div className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
            {hasSession && (
              <Button
                onClick={() => navigate("wishlist")}
                className="min-h-11 rounded-lg bg-xmas-forest font-semibold text-xmas-cream hover:bg-xmas-pine"
              >
                <Gift aria-hidden /> Ituloy ang Wishlist ko
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("status")}
              className="min-h-11 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
            >
              <Bell aria-hidden /> View Status
            </Button>
            {!hasSession && event.registrationOpen && (
              <Button
                variant="outline"
                onClick={() => navigate("register")}
                className="min-h-11 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
              >
                <UserRound aria-hidden /> Bagong participant? Mag-register
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => navigate("welcome")}
              className="min-h-11 rounded-lg text-xmas-forest hover:bg-accent"
            >
              <Home aria-hidden /> Balik sa Home
            </Button>
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs italic text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            I-refresh ang page anumang oras para sa pinakabagong status.
          </p>
        </div>
      </ChristmasCard>

      {/* No active session → embedded sign-in, right here. A returning
          participant can get back in (and to their wishlist) without hunting
          for another page — no dead ends. */}
      {!hasSession && onSignIn && (
        <SignInCard
          idPrefix="wait-signin"
          title="Nag-register na? Sign In dito"
          description="I-type ang First name mo, Last name mo, at 6-digit PIN mo para makapasok — makikita mo agad ang wishlist mo, at dito rin lalabas ang Monito/Monita mo pag na-release na ang bunutan."
          onSuccess={onSignIn}
        />
      )}
    </div>
  );
}

export default function CheckView({ ctx }: { ctx: AppCtx }) {
  const { navigate, session, event, refreshEvent, setSession, setAssignment, assignment } = ctx;
  const [noAssignment, setNoAssignment] = useState(false);
  const [found, setFound] = useState(false);

  const released = event?.randomizationStatus === "released";

  // Keep the event state fresh: the moment the admin releases the results,
  // this page switches itself into reveal mode without the user reloading.
  useEffect(() => {
    void refreshEvent();
    const id = window.setInterval(() => {
      void refreshEvent();
    }, 15000);
    return () => window.clearInterval(id);
  }, [refreshEvent]);

  // Auto-resolve the assignment for a LIVE session: someone who signed in
  // while waiting (e.g. from the panel above) sees their gift box appear the
  // moment the admin releases — no need to type the PIN all over again.
  useEffect(() => {
    if (!session || !released || found || noAssignment) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<MeWithAssignment>("/api/me", { token: session.token });
        if (cancelled) return;
        if (data.assignment) {
          setAssignment(data.assignment);
          setFound(true);
        } else {
          setNoAssignment(true);
        }
      } catch {
        /* stale session — the sign-in card still works as the fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, released, found, noAssignment, setAssignment]);

  /** Sign-in from the released-mode card. */
  const handleSignIn = (data: SignInResult) => {
    setSession({
      token: data.token,
      identityCode: data.identityCode,
      firstName: data.firstName,
      lastName: data.lastName,
      pin: data.pin,
    });
    if (data.released && data.assignment) {
      setAssignment(data.assignment);
      setFound(true);
      toast.success("Nahanap na! Buksan ang gift box…");
    } else if (data.released) {
      setNoAssignment(true);
    } else {
      // Extremely rare: results were released when the page loaded but the
      // admin re-locked before the submit landed. Refresh to the live panel.
      void refreshEvent();
      toast.success(`Naka-sign in ka na, ${data.identityCode}! 🎄`);
    }
  };

  /** Sign-in from the pre-release waiting panel. */
  const handleWaitingSignIn = (data: SignInResult) => {
    setSession({
      token: data.token,
      identityCode: data.identityCode,
      firstName: data.firstName,
      lastName: data.lastName,
      pin: data.pin,
    });
    if (data.released && data.assignment) {
      setAssignment(data.assignment);
      setFound(true);
      toast.success("Nahanap na! Buksan ang gift box…");
    } else if (data.released) {
      toast.success(`Naka-sign in ka na, ${data.identityCode}! 🎄`);
      void refreshEvent();
    } else {
      toast.success(
        `Naka-sign in ka na, ${data.identityCode}! 🎄 Dito lalabas ang Monito/Monita mo pag na-release na — at puwede mo ring ituloy ang wishlist mo.`
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <SectionTitle icon={<Gift className="h-5 w-5 text-xmas-forest" aria-hidden />}>
        Check My Monito/Monita
      </SectionTitle>

      {released ? (
        <>
          {/* Already have the assignment this session → gift box reveal */}
          {found && assignment && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="font-heading text-lg font-bold text-xmas-forest">
                Handa na ang assignment mo! 🎉
              </p>
              <GiftBox size={150} label="Buksan ang gift box!" onOpen={() => navigate("my-assignment")} />
            </div>
          )}

          {/* Live session but assignment not resolved yet — resolving… */}
          {session && !found && !noAssignment && (
            <ChristmasCard className="p-6 text-center" aria-busy="true">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-xmas-gold" aria-hidden />
              <p className="mt-3 text-sm font-medium text-xmas-forest">
                Kinukuha ang Monito/Monita mo…
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sandali lang — naka-sign in ka na bilang {session.identityCode}. 🎄
              </p>
            </ChristmasCard>
          )}

          {/* No session → the sign-in card */}
          {!session && !found && (
            <SignInCard
              idPrefix="signin"
              description="Ilagay ang First name mo, Last name mo, at ang 6-digit PIN na ginawa mo noong registration. Ito ang susi mo para makita ang Monito/Monita mo!"
              onSuccess={handleSignIn}
            />
          )}

          {/* Released but no assignment */}
          {noAssignment && (
            <Alert className="border-xmas-gold/60 bg-xmas-gold/10 text-[#7a6414]">
              <AlertTitle>Wala pang assignment sa iyo.</AlertTitle>
              <AlertDescription className="text-[#7a6414]/90">
                Released na sana pero wala pang assignment sa iyo. Pakicontact ang admin.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : event ? (
        /* NOT yet released → live waiting panel (never a dead form) */
        <WaitingPanel
          event={event}
          hasSession={!!session}
          navigate={navigate}
          onSignIn={handleWaitingSignIn}
        />
      ) : (
        /* Event still loading */
        <div className="space-y-4" aria-busy="true" aria-label="Naglo-load ang event status">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {/* Event status summary (released mode only — waiting panel has its own) */}
      {released && event && (
        <ChristmasCard className="p-4 sm:p-6">
          <h3 className="flex items-center gap-2 font-heading text-base font-bold text-xmas-forest">
            <Bell className="h-4 w-4 text-xmas-gold" aria-hidden /> Event Status Summary
          </h3>
          <div className="mt-3 space-y-3">
            <StatusChips event={event} />
            <p className="text-xs text-muted-foreground">
              Auto-refresh ang status na ito kapag binuksan mo ulit ang page.
            </p>
          </div>
        </ChristmasCard>
      )}
    </div>
  );
}
