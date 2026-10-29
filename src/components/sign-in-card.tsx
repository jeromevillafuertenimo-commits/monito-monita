"use client";

// Shared participant sign-in card: First name + Last name + the personal
// 6-digit PIN. ONE component used everywhere a participant can get stranded:
// - Home page (locked AND unlocked) — the main sign-in.
// - Wishlist page (no active session) — get back in to finish or edit wishes.
// - Check page (pre-release waiting panel + released sign-in form).
//
// Why a shared component: non-techy participants used to get stuck when their
// session disappeared (closed the browser, opened a new tab, device shared).
// With this card embedded in every entry point, typing their name + PIN is
// ALWAYS enough to get back in — there are no dead ends anywhere in the app.
import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { AssignmentResult } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { toast } from "sonner";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { SectionTitle, ChristmasCard } from "@/components/decor";

export interface SignInResult {
  token: string;
  identityCode: string;
  wishlistSubmitted: boolean;
  submissionsLocked: boolean;
  released: boolean;
  assignment: AssignmentResult | null;
  /** Echoed from the form so the app can show/copy them (never sent back by the server). */
  firstName?: string;
  lastName?: string;
  pin?: string;
}

interface SignInCardProps {
  /** Called after a successful sign-in; the parent owns session/routing. */
  onSuccess: (data: SignInResult) => void;
  title?: string;
  description?: string;
  /** Unique prefix for input ids so two cards never collide on one page. */
  idPrefix?: string;
  /** Optional content below the form (e.g. a "Mag-register" escape hatch). */
  children?: React.ReactNode;
}

export default function SignInCard({
  onSuccess,
  title = "Mag-sign in",
  description = "Ilagay ang First name mo, Last name mo, at ang 6-digit PIN na ginawa mo noong registration.",
  idPrefix = "signin",
  children,
}: SignInCardProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (!firstName.trim() || !lastName.trim()) {
      const msg = "Pakilagay ang First name at Last name mo.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      const msg = "Pakicomplete ang 6-digit PIN mo (numbers lang, eksaktong 6 digits).";
      setError(msg);
      toast.error(msg);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiJson<SignInResult>("/api/access-pin", {
        method: "POST",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          pin,
        }),
      });
      const typedPin = pin;
      setPin(""); // keep the names so a retry only needs the PIN
      onSuccess({ ...data, firstName: firstName.trim(), lastName: lastName.trim(), pin: typedPin });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "May naganap na error. Pakisubok muli.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ChristmasCard className="w-full p-4 sm:p-6">
      <SectionTitle icon={<ShieldCheck className="h-5 w-5 text-xmas-gold" aria-hidden />}>
        {title}
      </SectionTitle>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-first`}>First Name</Label>
            <div className="relative">
              <UserRound
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id={`${idPrefix}-first`}
                value={firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFirstName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Juan"
                maxLength={60}
                autoComplete="given-name"
                autoCapitalize="words"
                className="pl-8"
                aria-invalid={!!error && !firstName.trim()}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-last`}>Last Name</Label>
            <Input
              id={`${idPrefix}-last`}
              value={lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setLastName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Dela Cruz"
              maxLength={60}
              autoComplete="family-name"
              autoCapitalize="words"
              aria-invalid={!!error && !lastName.trim()}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-pin`} className="sr-only">
            6-digit PIN
          </Label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={pin}
              onChange={(v: string) => {
                setPin(v);
                setError(null);
              }}
              inputMode="numeric"
              aria-label="6-digit PIN"
              aria-invalid={!!error}
              disabled={submitting}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-13 w-11 border-xmas-forest/40 text-xl sm:h-14 sm:w-12 sm:text-2xl"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="min-h-12 w-full rounded-lg bg-xmas-forest text-base font-semibold text-xmas-cream hover:bg-xmas-pine"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Kinicheck ang details mo…
            </>
          ) : (
            <>
              <KeyRound aria-hidden /> Sign In
            </>
          )}
        </Button>
      </form>

      {error && (
        <Alert variant="destructive" role="alert" className="mt-4 text-left">
          <AlertTitle>Hindi tama ang details.</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {children}
    </ChristmasCard>
  );
}
