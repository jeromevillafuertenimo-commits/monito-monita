"use client";

// Participant registration: real name + sex + unique two-word identity code + 6-digit PIN.
import { useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Lock, ShieldCheck, Star } from "lucide-react";
import { AppCtx } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { ANIMALS, COLORS, FLOWERS } from "@/lib/words";
import { toast } from "sonner";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { SectionTitle, ChristmasCard } from "@/components/decor";
import { Combobox } from "@/components/combobox";

type Sex = "" | "male" | "female";

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  sex?: string;
  color?: string;
  word?: string;
  pin?: string;
  pinConfirm?: string;
}

export default function RegisterView({ ctx }: { ctx: AppCtx }) {
  const { navigate, event, setSession } = ctx;
  const registrationClosed = !!event && !event.registrationOpen;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState<Sex>("");
  const [color, setColor] = useState("");
  const [word, setWord] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const wordOptions = sex === "female" ? FLOWERS : sex === "male" ? ANIMALS : [];
  const wordLabel = sex === "female" ? "Flower" : sex === "male" ? "Animal" : "Flower / Animal";
  const wordPlaceholder = sex
    ? `Pumili ng ${sex === "female" ? "flower" : "animal"}`
    : "Piliin muna ang sex";
  const previewCode = color && word ? `${color} ${word}` : null;

  const onSexChange = (v: string) => {
    setSex(v as "male" | "female");
    setWord(""); // reset word when sex changes (different word list)
    setErrors((prev) => ({ ...prev, sex: undefined, word: undefined }));
  };

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (firstName.trim().length < 2) errs.firstName = "Pakilagay ang first name mo (hindi kukulang sa 2 characters).";
    if (lastName.trim().length < 2) errs.lastName = "Pakilagay ang last name mo (hindi kukulang sa 2 characters).";
    if (!sex) errs.sex = "Piliin ang iyong kasarian.";
    if (!color) errs.color = "Pumili ng color.";
    if (!word) errs.word = `Pumili ng ${sex === "female" ? "flower" : "animal"}.`;
    if (!/^\d{6}$/.test(pin)) errs.pin = "Pakicomplete ang 6-digit PIN mo (numbers lang, eksaktong 6 digits).";
    if (!/^\d{6}$/.test(pinConfirm)) errs.pinConfirm = "Pakicheck ulit ang PIN mo (numbers lang, eksaktong 6 digits).";
    else if (pin !== pinConfirm) errs.pinConfirm = "Hindi tugma ang dalawang PIN. Pakicheck ulit.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) {
      toast.error("May kulang o mali sa form — pakicheck ang mga nakapula.");
      return;
    }
    setServerError(null);
    setSubmitting(true);
    try {
      const data = await apiJson<{ identityCode: string; sessionToken: string }>("/api/register", {
        method: "POST",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          sex,
          color,
          word,
          pin,
        }),
      });
      setSession({
        token: data.sessionToken,
        identityCode: data.identityCode,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        pin,
      });
      toast.success("Registration successful! Proceed na tayo sa wishlist.");
      navigate("confirmation");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "May naganap na error. Pakisubok muli.";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate("welcome")}
          className="min-h-11 gap-2 rounded-lg px-3 text-xmas-forest hover:bg-accent"
        >
          <ArrowLeft aria-hidden /> Bumalik sa Home
        </Button>
      </div>

      <SectionTitle icon={<Star className="h-5 w-5 fill-xmas-gold text-xmas-gold" aria-hidden />}>
        Participant Registration
      </SectionTitle>

      {registrationClosed ? (
        <Alert variant="destructive">
          <Lock aria-hidden />
          <AlertTitle>Registration closed.</AlertTitle>
          <AlertDescription>Sarado na po ang registration. Pakicontact ang admin.</AlertDescription>
        </Alert>
      ) : (
        <ChristmasCard className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Names */}
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Juan"
                    maxLength={60}
                    autoComplete="given-name"
                    aria-invalid={!!errors.firstName}
                  />
                  {errors.firstName && (
                    <p className="text-xs font-medium text-destructive">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Dela Cruz"
                    maxLength={60}
                    autoComplete="family-name"
                    aria-invalid={!!errors.lastName}
                  />
                  {errors.lastName && (
                    <p className="text-xs font-medium text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ang pangalan mo ay nakatago — ang makikita lang ng iba ay ang identity code mo.
              </p>
            </div>

            {/* Sex */}
            <div className="space-y-2">
              <p className="text-sm font-medium" id="sex-label">
                Kasarian (Sex)
              </p>
              <RadioGroup
                value={sex}
                onValueChange={onSexChange}
                aria-labelledby="sex-label"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                <Label
                  htmlFor="sex-female"
                  className={`min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                    sex === "female" ? "border-xmas-forest bg-xmas-forest/10" : "hover:border-xmas-gold/70"
                  }`}
                >
                  <RadioGroupItem id="sex-female" value="female" aria-label="Babae (Female)" />
                  <span className="text-sm font-semibold text-xmas-forest">Babae (Female)</span>
                </Label>
                <Label
                  htmlFor="sex-male"
                  className={`min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                    sex === "male" ? "border-xmas-forest bg-xmas-forest/10" : "hover:border-xmas-gold/70"
                  }`}
                >
                  <RadioGroupItem id="sex-male" value="male" aria-label="Lalaki (Male)" />
                  <span className="text-sm font-semibold text-xmas-forest">Lalaki (Male)</span>
                </Label>
              </RadioGroup>
              {errors.sex && <p className="text-xs font-medium text-destructive">{errors.sex}</p>}
            </div>

            {/* Identity code */}
            <div className="space-y-3">
              <p className="text-sm font-medium" id="code-label">
                Secret Identity Code
              </p>
              <div className="grid gap-3 sm:grid-cols-2" aria-labelledby="code-label">
                <div className="space-y-1.5">
                  <Label htmlFor="select-color" className="text-xs text-muted-foreground">
                    Color
                  </Label>
                  <Combobox
                    id="select-color"
                    options={COLORS}
                    value={color}
                    onChange={(v) => {
                      setColor(v);
                      setErrors((prev) => ({ ...prev, color: undefined }));
                    }}
                    placeholder="Pumili ng color"
                    searchPlaceholder="I-type ang color… (e.g. ameth)"
                    emptyText="Walang color na tugma — subukan ang ibang spelling."
                    invalid={!!errors.color}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="select-word" className="text-xs text-muted-foreground">
                    {wordLabel}
                  </Label>
                  <Combobox
                    id="select-word"
                    options={wordOptions}
                    value={word}
                    onChange={(v) => {
                      setWord(v);
                      setErrors((prev) => ({ ...prev, word: undefined }));
                    }}
                    placeholder={wordPlaceholder}
                    searchPlaceholder={`I-type ang ${sex === "female" ? "flower" : "animal"}… (e.g. gum)`}
                    emptyText="Walang tugma. Subukan ang ibang pangalan."
                    disabled={!sex}
                    invalid={!!errors.word}
                  />
                </div>
              </div>

              {/* Live preview */}
              <div
                className="flex min-h-[64px] items-center justify-center gap-2 rounded-lg border border-dashed border-xmas-gold bg-xmas-gold/10 p-4"
                aria-live="polite"
              >
                {previewCode ? (
                  <>
                    <Star className="h-5 w-5 shrink-0 fill-xmas-gold text-xmas-gold" aria-hidden />
                    <span className="font-heading text-2xl font-bold text-xmas-forest sm:text-3xl">
                      {previewCode}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Pumili ng color at flower/animal…
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                May <span className="font-semibold text-xmas-forest">search box</span> sa bawat
                dropdown — i-type lang (e.g. "gum" para sa Gumamela). Pumili ng combination na
                unique — kung may kumuha na, magsusubmit kami ng error at pumili ka ng iba.
              </p>
              {(errors.color || errors.word) && (
                <div className="space-y-1">
                  {errors.color && <p className="text-xs font-medium text-destructive">{errors.color}</p>}
                  {errors.word && <p className="text-xs font-medium text-destructive">{errors.word}</p>}
                </div>
              )}
            </div>

            {/* 6-digit PIN */}
            <div className="space-y-3 rounded-lg border border-xmas-gold/50 bg-xmas-gold/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium" id="pin-label">
                <ShieldCheck className="h-4 w-4 text-xmas-gold" aria-hidden />
                Gumawa ng iyong 6-digit PIN
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pin-input" className="text-xs text-muted-foreground">
                    6-digit PIN
                  </Label>
                  <InputOTP
                    id="pin-input"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={pin}
                    onChange={(v: string) => {
                      setPin(v);
                      setErrors((prev) => ({ ...prev, pin: undefined }));
                    }}
                    inputMode="numeric"
                    aria-label="6-digit PIN"
                    aria-invalid={!!errors.pin}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-11 border-xmas-forest/30 text-lg" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {errors.pin && <p className="text-xs font-medium text-destructive">{errors.pin}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pin-confirm-input" className="text-xs text-muted-foreground">
                    Kumpirmahin ang PIN
                  </Label>
                  <InputOTP
                    id="pin-confirm-input"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={pinConfirm}
                    onChange={(v: string) => {
                      setPinConfirm(v);
                      setErrors((prev) => ({ ...prev, pinConfirm: undefined }));
                    }}
                    inputMode="numeric"
                    aria-label="Kumpirmahin ang 6-digit PIN"
                    aria-invalid={!!errors.pinConfirm}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-11 border-xmas-forest/30 text-lg" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {errors.pinConfirm && (
                    <p className="text-xs font-medium text-destructive">{errors.pinConfirm}</p>
                  )}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-xmas-forest">Tandaan ito!</span> Ang PIN mo ang
                gagamitin mo sa Home page para makita ang Monito/Monita mo pagkatapos ng official
                bunutan. I memorize o isulat ito sa Notes — hindi namin ito ipapakita ulit.
              </p>
            </div>

            {/* Server error (e.g. duplicate code) */}
            {serverError && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Hindi natuloy ang registration.</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {/* Already-registered shortcut: the most common reason for this
                error is a RETURNING participant who wandered into registration
                by mistake. One tap takes them to the Home sign-in (name+PIN). */}
            {serverError && /mag-sign in|nakarehistro|naka-register/i.test(serverError) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("welcome")}
                className="min-h-11 w-full rounded-lg border-xmas-forest/30 text-xmas-forest hover:bg-accent"
              >
                <KeyRound aria-hidden /> Nag-register na ako — Sign In sa Home
              </Button>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="min-h-12 w-full rounded-lg bg-xmas-forest text-base font-semibold text-xmas-cream hover:bg-xmas-pine"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden /> Nagre-register…
                </>
              ) : (
                <>
                  Register &amp; Proceed sa Wishlist <ArrowRight aria-hidden />
                </>
              )}
            </Button>
          </form>
        </ChristmasCard>
      )}
    </div>
  );
}
