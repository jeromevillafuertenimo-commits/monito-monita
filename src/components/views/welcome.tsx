"use client";

// Welcome / landing view — festive, Christ-centered Monito-Monita intro.
//
// The sign-in card (First name + Last name + 6-digit PIN) is ALWAYS available:
// - Locked home: everyone signs in to see their Monito/Monita.
// - Unlocked home: returning participants sign in to finish or edit their
//   wishlist — even if they left it empty and their session is long gone.
//   After sign-in they are taken STRAIGHT to their wishlist, no detours.
import { useState } from "react";
import {
  Bell,
  Gift,
  KeyRound,
  Lock,
  LogOut,
  Sparkles,
  Star,
  TreePine,
} from "lucide-react";
import { AppCtx } from "@/lib/app-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SignInCard, { SignInResult } from "@/components/sign-in-card";
import { GiftBox } from "@/components/gift-box";
import { SectionTitle, ChristmasCard, BudgetBadge, FellowshipDateBadge } from "@/components/decor";

export default function WelcomeView({ ctx }: { ctx: AppCtx }) {
  const { navigate, session, event, setSession, refreshEvent, setAssignment } = ctx;
  const locked = !!event?.submissionsLocked;
  const eventName = event?.eventName ?? "Christmas Exchange Gift";

  const [noAssignment, setNoAssignment] = useState(false);

  /** Log out: clears the saved session and the form so the next person
   * on this device starts with a completely fresh screen. */
  const handleLogout = () => {
    setSession(null); // also removes the saved session from this device
    setNoAssignment(false);
    toast.success(
      "Naka-log out na. 👋 Mag-sign in muli gamit ang pangalan at PIN mo kapag babalik ka."
    );
  };

  /** One sign-in handler for locked AND unlocked homes — routes the user to
   * wherever they most likely want to go, so nobody lands on a dead end. */
  const handleSignIn = (data: SignInResult) => {
    setSession({
      token: data.token,
      identityCode: data.identityCode,
      firstName: data.firstName,
      lastName: data.lastName,
      pin: data.pin,
    });
    void refreshEvent();
    if (data.released && data.assignment) {
      setAssignment(data.assignment);
      toast.success(`Welcome, ${data.identityCode}! Buksan na ang gift box mo! 🎁`);
      navigate("my-assignment");
    } else if (data.released) {
      // Released but no assignment row for them — ask the admin for help.
      setNoAssignment(true);
    } else if (locked) {
      toast.success(`Welcome, ${data.identityCode}! Hindi pa released ang bunutan.`);
      navigate("status");
    } else {
      // Back BEFORE the lock — take them straight to their wishlist so they
      // can fill it out or edit it right away. (This is the "I left my
      // wishlist empty and came back" rescue path.)
      if (data.wishlistSubmitted) {
        toast.success(
          `Welcome back, ${data.identityCode}! 🎄 Naka-save na ang wishlist mo — puwede mo pa itong i-edit habang open ang submissions.`
        );
      } else {
        toast.success(
          `Welcome back, ${data.identityCode}! 🎄 Ituloy mo ang wishlist mo — fill up, tapos submit. Kaya mo 'yan!`
        );
      }
      navigate("wishlist");
    }
  };

  // ---------- LOCKED HOME: simple sign-in for everyone ----------
  if (locked) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
        {/* Compact festive hero */}
        <section aria-label="Maligayang Pasko" className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3" aria-hidden>
            <Star className="h-4 w-4 fill-xmas-gold text-xmas-gold" />
            <TreePine className="h-7 w-7 text-xmas-pine" />
            <Star className="h-4 w-4 fill-xmas-gold text-xmas-gold" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-xmas-forest sm:text-4xl">
            Maligayang <span className="gold-shimmer">Pasko</span>!
          </h1>
          <p className="font-heading text-base font-semibold text-xmas-burgundy sm:text-lg">
            {eventName}
          </p>
          <FellowshipDateBadge />
          <p className="flex items-center gap-2 rounded-full border border-xmas-burgundy/40 bg-xmas-burgundy/10 px-4 py-1.5 text-xs font-semibold text-xmas-burgundy">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Naka-lock na ang submissions
          </p>
        </section>

        {/* Session welcome-back */}
        {session && (
          <ChristmasCard className="w-full p-4 text-left sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-heading text-base font-bold text-xmas-forest">
                Kumusta, {session.identityCode}! 🎉
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {event?.randomizationStatus === "released" ? (
                  /* Results are out — the live session can reveal the
                     assignment right away (Check view auto-resolves it). */
                  <Button
                    onClick={() => navigate("check")}
                    className="min-h-11 rounded-lg bg-xmas-gold font-semibold text-xmas-forest hover:brightness-95"
                  >
                    <Gift aria-hidden /> Tingnan ang Monito/Monita ko
                  </Button>
                ) : null}
                <Button
                  onClick={() => navigate("wishlist")}
                  className="min-h-11 rounded-lg bg-xmas-forest text-xmas-cream hover:bg-xmas-pine"
                >
                  <Gift aria-hidden /> Ang Wishlist ko
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("status")}
                  className="min-h-11 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
                >
                  <Bell aria-hidden /> Status
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="min-h-11 rounded-lg text-xmas-burgundy hover:bg-xmas-burgundy/10 hover:text-xmas-burgundy"
                >
                  <LogOut aria-hidden /> Log Out
                </Button>
              </div>
            </div>
          </ChristmasCard>
        )}

        {/* Sign-in card — the main event (key forces a fresh form after logout) */}
        <SignInCard
          key={session ? "signed-in" : "signed-out"}
          idPrefix="home"
          onSuccess={handleSignIn}
          description="Ilagay ang First name mo, Last name mo, at ang 6-digit PIN na ginawa mo noong registration para makita ang Monito/Monita mo pagkatapos ng bunutan. 🔑"
        >
          <p className="mt-4 border-t border-border/70 pt-3 text-xs leading-relaxed text-muted-foreground">
            Nakalimutan mo ang pangalan o PIN mo? Humingi ng tulong sa admin — puwede nilang
            i-reset ang PIN mo.
          </p>
        </SignInCard>

        {noAssignment && (
          <Alert className="w-full border-xmas-gold/60 bg-xmas-gold/10 text-left text-[#7a6414]">
            <AlertTitle className="text-[#7a6414]">Wala pang assignment sa iyo.</AlertTitle>
            <AlertDescription className="text-[#7a6414]/90">
              Released na sana pero wala pang assignment sa iyo. Pakicontact ang admin.
            </AlertDescription>
          </Alert>
        )}

        {/* Quick actions */}
        <section aria-label="Mga aksyon" className="grid w-full gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate("status")}
            className="flex min-h-[44px] flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-xmas-gold hover:shadow-md focus-visible:outline-2 focus-visible:outline-xmas-gold"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-xmas-forest/10 text-xmas-forest">
              <Bell className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-heading text-base font-bold text-xmas-forest">View Status</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              Tingnan kung released na ang bunutan.
            </span>
          </button>
          {event?.registrationOpen && (
            <button
              type="button"
              onClick={() => navigate("register")}
              className="flex min-h-[44px] flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-xmas-gold hover:shadow-md focus-visible:outline-2 focus-visible:outline-xmas-gold"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-xmas-forest/10 text-xmas-forest">
                <Gift className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-heading text-base font-bold text-xmas-forest">Register</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                May kasama pa kayong hindi registered?
              </span>
            </button>
          )}
        </section>

        <p className="max-w-md text-xs italic leading-relaxed text-muted-foreground">
          Kami ay nagdiriwang ng tunay na diwa ng Pasko — ang kapanganakan ng ating Panginoon. 🕊️
        </p>
      </div>
    );
  }

  // ---------- NORMAL HOME (before lock): register, sign in, wishlist, check ----------
  const quickActions = [
    {
      view: "register" as const,
      title: "Register",
      sub: "Bagong participant? Mag-register para sumali sa exchange gift.",
      icon: Gift,
    },
    {
      view: "check" as const,
      title: "Check My Monito/Monita",
      sub: "Makikita dito ang Monito/Monita mo pagkatapos ng bunutan at release.",
      icon: KeyRound,
    },
    {
      view: "status" as const,
      title: "View Status",
      sub: "Tingnan kung saan na ang event.",
      icon: Bell,
    },
  ];

  const steps = [
    {
      title: "Register",
      desc: "Mag-register gamit ang pangalan mo, pumili ng secret identity code, at gumawa ng 6-digit PIN mo.",
    },
    {
      title: "Wishlist",
      desc: "Isulat ang hanggang tatlong gift wishes mo para may options ang Monito/Monita mo. Puwede mong balikan at i-edit anumang oras habang open ang submissions — sign in lang gamit ang pangalan mo at PIN.",
    },
    {
      title: "Hintayin ang bunutan",
      desc: "Pagkatapos ng official bunutan at release, i-type lang ang First name, Last name, at 6-digit PIN mo sa Home para makita ang Monito/Monita mo.",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
      {/* Hero */}
      <section aria-label="Maligayang Pasko" className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3" aria-hidden>
          <Star className="h-4 w-4 fill-xmas-gold text-xmas-gold" />
          <TreePine className="h-7 w-7 text-xmas-pine" />
          <Star className="h-4 w-4 fill-xmas-gold text-xmas-gold" />
        </div>
        <h1 className="font-heading text-4xl font-bold text-xmas-forest sm:text-5xl">
          Maligayang <span className="gold-shimmer">Pasko</span>!
        </h1>
        <p className="font-heading text-lg font-semibold text-xmas-burgundy sm:text-xl">{eventName}</p>
        <FellowshipDateBadge />
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Welcome sa ating Christmas Monito-Monita! Mag-register, piliin ang iyong secret code, at
          isulat ang mga wishes mo para sa exchange gift natin.{" "}
          <span className="font-semibold text-xmas-forest">
            Nag-register ka na? Sign in sa ibaba para i-edit ang wishlist mo o makita ang
            Monito/Monita mo.
          </span>
        </p>
        {event && <BudgetBadge min={event.budgetMin} max={event.budgetMax} />}
      </section>

      {/* Welcome back card (already signed in on this device) */}
      {session && (
        <ChristmasCard className="w-full p-4 text-left sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-heading text-lg font-bold text-xmas-forest">
                  Kumusta, {session.identityCode}! 🎉
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Nandito ka na ulit — ituloy mo lang kung saan ka nagtapos.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => navigate("wishlist")}
                  className="min-h-11 rounded-lg bg-xmas-forest text-xmas-cream hover:bg-xmas-pine"
                >
                  <Gift aria-hidden /> Ituloy ang Wishlist
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("check")}
                  className="min-h-11 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
                >
                  <KeyRound aria-hidden /> Tingnan ang Monito/Monita ko
                </Button>
              </div>
            </div>
            {/* Log Out — para sa susunod na gagamit ng device na ito */}
            <div className="border-t border-border/70 pt-3">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="-ml-2 min-h-11 rounded-lg px-3 text-xmas-burgundy hover:bg-xmas-burgundy/10 hover:text-xmas-burgundy"
              >
                <LogOut aria-hidden /> Log Out
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Buburahin ang session mo sa device na ito — hindi makikita ng susunod na gagamit ang
                details at account mo.
              </p>
            </div>
          </div>
        </ChristmasCard>
      )}

      {/* Returning participant sign-in — ALWAYS visible when not signed in.
          This is the fix for "I left my wishlist empty and came back": name +
          PIN is all they need, and success takes them straight to the wishlist. */}
      {!session && (
        <div className="w-full">
          <SignInCard
            idPrefix="signin"
            title="Nag-register na? Sign In dito"
            description="Balik ka para tapusin o baguhin ang wishlist mo? I-type lang ang First name mo, Last name mo, at ang 6-digit PIN mo — makakapasok ka agad. 🔑"
            onSuccess={handleSignIn}
          />
          {noAssignment && (
            <Alert className="mt-4 w-full border-xmas-gold/60 bg-xmas-gold/10 text-left text-[#7a6414]">
              <AlertTitle className="text-[#7a6414]">Wala pang assignment sa iyo.</AlertTitle>
              <AlertDescription className="text-[#7a6414]/90">
                Released na sana pero wala pang assignment sa iyo. Pakicontact ang admin.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Gift box CTA — clearly labelled for NEW participants so returning
          users don't wander into registration by accident */}
      <GiftBox
        size={180}
        label="Bagong participant? Pindutin ang gift box para mag-register!"
        onOpen={() => navigate("register")}
      />

      {/* Quick actions */}
      <section aria-label="Mga aksyon" className="grid w-full gap-4 sm:grid-cols-3">
        {quickActions.map(({ view, title, sub, icon: Icon }) => (
          <button
            key={view}
            type="button"
            onClick={() => navigate(view)}
            className="flex min-h-[44px] flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-xmas-gold hover:shadow-md focus-visible:outline-2 focus-visible:outline-xmas-gold sm:p-6"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-xmas-forest/10 text-xmas-forest">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-heading text-base font-bold text-xmas-forest">{title}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">{sub}</span>
          </button>
        ))}
      </section>

      {/* How it works */}
      <section aria-label="Paano ito gumagana" className="w-full">
        <ChristmasCard className="p-4 text-left sm:p-6">
          <SectionTitle
            className="mb-4"
            icon={<Sparkles className="h-5 w-5 text-xmas-gold" aria-hidden />}
          >
            Paano ito gumagana?
          </SectionTitle>
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-xmas-gold font-heading text-sm font-bold text-xmas-forest">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-xmas-forest">{s.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </ChristmasCard>
      </section>

      <p className="max-w-md text-xs italic leading-relaxed text-muted-foreground">
        Kami ay nagdiriwang ng tunay na diwa ng Pasko — ang kapanganakan ng ating Panginoon. 🕊️
      </p>
    </div>
  );
}
