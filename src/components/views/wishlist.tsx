"use client";

// Participant wishlist: create/update up to 3 gift wishes, review, then submit.
import { useEffect, useMemo, useRef, useState } from "react";
import { lsGetJson, lsRemove, lsSetJson } from "@/lib/local-store";
import { ArrowLeft, Bell, Eye, Gift, Loader2, Lock, Star } from "lucide-react";
import { AppCtx, WishlistDTO } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import SignInCard, { SignInResult } from "@/components/sign-in-card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionTitle, ChristmasCard, BudgetBadge } from "@/components/decor";

interface MeResponse {
  identityCode: string;
  sex: "male" | "female";
  wishlist: WishlistDTO | null;
  submissionsLocked: boolean;
  released: boolean;
}

interface WishForm {
  name: string;
  details: string;
}

const WISH_IDEAS = [
  "Tumbler",
  "Mug",
  "Tote bag",
  "Umbrella",
  "Wallet",
  "Notebook set",
  "Scented candle",
  "Hand towel",
  "Socks",
  "Chocolates",
  "Planner",
  "Earphones case",
  "Lotion set",
  "Cap",
];

const PLACEHOLDERS: { name: string; details: string }[] = [
  { name: "e.g. T-shirt", details: "e.g. Size Medium, black, plain design" },
  { name: "e.g. Water tumbler", details: "e.g. 500 mL, preferably insulated" },
  { name: "e.g. Notebook", details: "e.g. A5 size, ruled pages" },
];

const EMPTY_WISHES: WishForm[] = [
  { name: "", details: "" },
  { name: "", details: "" },
  { name: "", details: "" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export default function WishlistView({ ctx }: { ctx: AppCtx }) {
  const { navigate, session, event, setAssignment, setSession } = ctx;
  const budgetMin = event?.budgetMin ?? 150;
  const budgetMax = event?.budgetMax ?? 200;

  const [retryTick, setRetryTick] = useState(0);
  const [loading, setLoading] = useState(!!session);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [identityCode, setIdentityCode] = useState(session?.identityCode ?? "");
  const [locked, setLocked] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [wishes, setWishes] = useState<WishForm[]>(EMPTY_WISHES);
  const [mode, setMode] = useState<"form" | "review">("form");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const draftRestored = useRef(false);
  const draftKey = session ? `mm-draft-wishlist:${session.identityCode}` : null;

  // Auto-save an unfinished wishlist on this device; restore it after a refresh.
  useEffect(() => {
    if (loading || loadError || !draftKey || draftRestored.current) return;
    draftRestored.current = true;
    const d = lsGetJson<WishForm[]>(draftKey);
    if (Array.isArray(d) && d.length === 3 && wishes.every((w) => !w.name && !w.details)) {
      setWishes(d.map((x) => ({ name: String(x?.name ?? "").slice(0, 80), details: String(x?.details ?? "").slice(0, 200) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadError, draftKey]);
  useEffect(() => {
    if (loading || !draftKey || !draftRestored.current) return;
    if (wishes.some((w) => w.name || w.details)) lsSetJson(draftKey, wishes);
  }, [wishes, loading, draftKey]);

  /** Tap an idea chip: fills the first empty wish name. */
  const addIdea = (idea: string) => {
    const idx = wishes.findIndex((w) => !w.name.trim());
    if (idx === -1) {
      toast("Puno na ang 3 wishes. Burahin muna ang isa para magdagdag ng idea.");
      return;
    }
    setWishes((prev) => prev.map((w, i) => (i === idx ? { ...w, name: idea } : w)));
  };

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<MeResponse>("/api/me", { token: session.token });
        if (cancelled) return;
        setIdentityCode(data.identityCode);
        setLocked(data.submissionsLocked);
        const w = data.wishlist;
        if (w) {
          setWishes([
            { name: w.wish1Name ?? "", details: w.wish1Details ?? "" },
            { name: w.wish2Name ?? "", details: w.wish2Details ?? "" },
            { name: w.wish3Name ?? "", details: w.wish3Details ?? "" },
          ]);
          setIsEdit(!!(w.wish1Name || w.wish2Name || w.wish3Name));
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "May naganap na error sa pag-load ng wishlist mo.";
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, retryTick]);

  /** "Subukan muli" after a load error (e.g. Wi-Fi blip). */
  const retryLoad = () => {
    setLoadError(null);
    setLoading(true);
    setRetryTick((t) => t + 1);
  };

  /** Embedded sign-in (no active session): after success, the session effect
   * above re-runs and loads the participant's wishlist automatically — they
   * never have to leave this page to get back in. */
  const handleRescueSignIn = (data: SignInResult) => {
    if (data.released && data.assignment) {
      // Results are out — the assignment page is where they want to be.
      setAssignment(data.assignment);
      navigate("my-assignment");
      return;
    }
    setSession({
      token: data.token,
      identityCode: data.identityCode,
      firstName: data.firstName,
      lastName: data.lastName,
      pin: data.pin,
    });
    toast.success(
      `Naka-sign in ka na, ${data.identityCode}! 🎄 Ito ang wishlist mo — puwede mo itong tapusin o i-edit.`
    );
  };

  const filledWishes = useMemo(
    () =>
      wishes
        .map((w) => ({ name: w.name.trim(), details: w.details.trim() }))
        .filter((w) => w.name.length > 0),
    [wishes]
  );

  const setWish = (idx: number, patch: Partial<WishForm>) =>
    setWishes((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));

  const goReview = () => {
    if (filledWishes.length === 0) {
      setFormError("Kailangan ng kahit ISANG (1) wish. Pakifill up ang Gift Wish #1.");
      toast.error("Kailangan ng kahit ISANG (1) wish.");
      return;
    }
    setFormError(null);
    setMode("review");
  };

  const submitWishlist = async () => {
    if (!session || submitting) return;
    if (filledWishes.length === 0) {
      setFormError("Kailangan ng kahit ISANG (1) wish. Pakifill up ang Gift Wish #1.");
      toast.error("Kailangan ng kahit ISANG (1) wish.");
      return;
    }
    setSubmitting(true);
    try {
      await apiJson<{ wishlist: WishlistDTO; updated: boolean }>("/api/wishlist", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({ wishes: filledWishes }),
      });
      if (draftKey) lsRemove(draftKey);
      toast.success("Na-save ang wishlist mo!");
      navigate("submitted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "May naganap na error. Pakisubok muli.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <SectionTitle icon={<Gift className="h-5 w-5 text-xmas-forest" aria-hidden />}>
        Ang Aking Wishlist
      </SectionTitle>

      {/* No session → embedded sign-in (never a dead end): typing their
          name + PIN right here loads their wishlist on the spot. */}
      {!session && (
        <SignInCard
          idPrefix="wl-signin"
          title="Wala kang active session — Sign In dito"
          description="Nag-register ka na? I-type lang ang First name mo, Last name mo, at 6-digit PIN mo para makapasok ulit at maituloy o i-edit ang wishlist mo."
          onSuccess={handleRescueSignIn}
        >
          <div className="mt-4 border-t border-border/70 pt-3 text-center">
            <p className="text-xs text-muted-foreground">
              Bago ka pa lang at hindi pa registered?
            </p>
            <Button
              variant="link"
              onClick={() => navigate("register")}
              className="min-h-11 text-xmas-forest underline underline-offset-2"
            >
              Mag-register dito
            </Button>
          </div>
        </SignInCard>
      )}

      {/* Loading */}
      {session && loading && (
        <ChristmasCard className="space-y-4 p-4 sm:p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </ChristmasCard>
      )}

      {/* Load error — always offer a way forward: retry, or sign in again
          in place (covers expired sessions after someone else signed in). */}
      {session && !loading && loadError && (
        <>
          <Alert variant="destructive" role="alert">
            <AlertTitle>Hindi ma-load ang wishlist mo.</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={retryLoad}
              className="min-h-11 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
            >
              Subukan muli
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setLoadError(null);
                setSession(null); // sign-in card appears right below, in place
              }}
              className="min-h-11 rounded-lg text-xmas-burgundy hover:bg-xmas-burgundy/10 hover:text-xmas-burgundy"
            >
              Sign In muli
            </Button>
          </div>
        </>
      )}

      {/* Loaded */}
      {session && !loading && !loadError && (
        <>
          {/* Identity + budget */}
          <ChristmasCard className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-xmas-forest/10 px-3 py-1.5 text-sm font-bold text-xmas-forest">
                <Star className="h-4 w-4 fill-xmas-gold text-xmas-gold" aria-hidden />
                {identityCode}
              </span>
              <BudgetBadge min={budgetMin} max={budgetMax} />
            </div>
            {isEdit && !locked && (
              <p className="mt-3 text-xs text-muted-foreground">
                May naka-save ka nang wishlist — puwede mong i-edit ito at i-update.
              </p>
            )}
          </ChristmasCard>

          {/* Reminder (exact text per spec) */}
          <div className="rounded-lg border border-xmas-gold/60 bg-xmas-gold/10 p-4 sm:p-5" role="note">
            <p className="flex items-center gap-2 font-heading text-base font-bold text-[#7a6414]">
              <Bell className="h-5 w-5 shrink-0" aria-hidden /> 🎁 EXCHANGE GIFT REMINDER
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-xmas-forest/90">
              <li>Ang budget para sa exchange gift ay ₱{budgetMin}–₱{budgetMax} lamang.</li>
              <li>Please be realistic and considerate sa pagpili ng wishes mo.</li>
              <li>
                Kung ang gift mo ay nangangailangan ng specific size, sukat, color, model, brand, or
                other important details, make sure na ilagay ang mga ito.
              </li>
              <li>Maglagay ng hanggang tatlong gift wishes para may options ang iyong Monito o Monita.</li>
            </ul>
          </div>

          {/* Locked: read-only */}
          {locked ? (
            <Alert className="border-xmas-burgundy/40">
              <Lock className="h-4 w-4 text-xmas-burgundy" aria-hidden />
              <AlertTitle className="text-xmas-burgundy">
                Naka-lock na ang submissions. Hindi na puwedeng mag-edit.
              </AlertTitle>
              <AlertDescription>
                {filledWishes.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Ito ang mga naisubmit mong wishes — final na po ito.
                    </p>
                    <ol className="w-full space-y-2">
                      {filledWishes.map((w, i) => (
                        <li key={`${w.name}-${i}`} className="rounded-md bg-muted/60 p-2.5 text-sm">
                          <span className="font-bold text-xmas-forest">
                            {i + 1}. {w.name}
                          </span>
                          {w.details && <span className="block text-muted-foreground">{w.details}</span>}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p>Wala ka pang naisubmit na wishlist bago mag-lock.</p>
                )}
              </AlertDescription>
            </Alert>
          ) : mode === "form" ? (
            /* Form */
            <ChristmasCard className="p-4 sm:p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  goReview();
                }}
                noValidate
                className="space-y-5"
              >
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-xmas-forest">
                    Walang maisip? Pindutin ang idea para idagdag 💡
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {WISH_IDEAS.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => addIdea(idea)}
                        className="min-h-9 rounded-full border border-xmas-gold/60 bg-xmas-gold/10 px-3 text-xs font-medium text-xmas-forest hover:bg-xmas-gold/25"
                      >
                        + {idea}
                      </button>
                    ))}
                  </div>
                </div>

                {wishes.map((w, idx) => (
                  <fieldset key={idx} className="space-y-3 rounded-lg border border-border/80 p-4">
                    <legend className="px-1 font-heading text-sm font-bold text-xmas-forest">
                      Gift Wish #{idx + 1}
                    </legend>
                    <div className="space-y-1.5">
                      <Label htmlFor={`wish-${idx + 1}-name`}>Gift name</Label>
                      <Input
                        id={`wish-${idx + 1}-name`}
                        value={w.name}
                        onChange={(e) => setWish(idx, { name: e.target.value })}
                        placeholder={PLACEHOLDERS[idx].name}
                        maxLength={80}
                      />
                      <p className="text-right text-[11px] text-muted-foreground" aria-hidden>
                        {w.name.length}/80
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`wish-${idx + 1}-details`}>
                        Details/specifications{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id={`wish-${idx + 1}-details`}
                        value={w.details}
                        onChange={(e) => setWish(idx, { details: e.target.value })}
                        placeholder={PLACEHOLDERS[idx].details}
                        maxLength={200}
                      />
                      <p className="text-right text-[11px] text-muted-foreground" aria-hidden>
                        {w.details.length}/200
                      </p>
                    </div>
                  </fieldset>
                ))}

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Kailangan ng kahit <span className="font-bold text-xmas-forest">ISANG (1) wish</span>.
                  Lahat ng gift requests ay dapat pumasa sa ₱{budgetMin}–₱{budgetMax} budget.
                </p>

                {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}

                <Button
                  type="submit"
                  className="min-h-12 w-full rounded-lg bg-xmas-forest text-base font-semibold text-xmas-cream hover:bg-xmas-pine"
                >
                  <Eye aria-hidden /> Review
                </Button>
              </form>
            </ChristmasCard>
          ) : (
            /* Review panel */
            <ChristmasCard className="p-4 sm:p-6">
              <h3 className="font-heading text-xl font-bold text-xmas-forest">Review ang Wishlist Mo</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pakicheck kung tama ang mga wishes mo bago i-submit.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-xmas-forest/10 px-3 py-1 text-sm font-bold text-xmas-forest">
                  <Star className="h-3.5 w-3.5 fill-xmas-gold text-xmas-gold" aria-hidden />
                  {identityCode}
                </span>
                <BudgetBadge min={budgetMin} max={budgetMax} />
              </div>
              <ol className="mt-4 space-y-3">
                {filledWishes.map((w, i) => (
                  <li
                    key={`${w.name}-${i}`}
                    className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/60 p-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-xmas-gold font-heading text-xs font-bold text-xmas-forest">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-xmas-forest">{w.name}</p>
                      {w.details && <p className="break-words text-sm text-muted-foreground">{w.details}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                Lahat ng gift requests ay dapat pumasa sa ₱{budgetMin}–₱{budgetMax} budget.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setMode("form")}
                  className="min-h-11 rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
                >
                  <ArrowLeft aria-hidden /> Balikan at I-edit
                </Button>
                <Button
                  onClick={submitWishlist}
                  disabled={submitting}
                  className="min-h-11 flex-1 rounded-lg bg-xmas-forest font-semibold text-xmas-cream hover:bg-xmas-pine"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden /> Nagse-save…
                    </>
                  ) : (
                    <>
                      <Gift aria-hidden /> {isEdit ? "Update Wishlist" : "Submit Wishlist"}
                    </>
                  )}
                </Button>
              </div>
            </ChristmasCard>
          )}
        </>
      )}
    </div>
  );
}
