"use client";

// Participant registration: real name + sex + unique two-word identity code + 6-digit PIN.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Dices, KeyRound, Loader2, Lock, ShieldCheck, Star } from "lucide-react";
import { AppCtx } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { ANIMALS, COLORS, FLOWERS } from "@/lib/words";
import { lsGetJson, lsRemove, lsSetJson } from "@/lib/local-store";
import { PinInput } from "@/components/pin-input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [availability, setAvailability] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [surprising, setSurprising] = useState(false);
  const draftReady = useRef(false);

  // Auto-save a draft (never the PIN) so a refresh doesn't wipe the form.
  useEffect(() => {
    const d = lsGetJson<{ firstName?: string; lastName?: string; sex?: Sex; color?: string; word?: string }>(
      "mm-draft-register"
    );
    if (d) {
      if (d.firstName) setFirstName(d.firstName);
      if (d.lastName) setLastName(d.lastName);
      if (d.sex === "male" || d.sex === "female") setSex(d.sex);
      if (d.color) setColor(d.color);
      if (d.word) setWord(d.word);
    }
    draftReady.current = true;
  }, []);
  useEffect(() => {
    if (!draftReady.current) return;
    lsSetJson("mm-draft-register", { firstName, lastName, sex, color, word });
  }, [firstName, lastName, sex, color, word]);

  // Live availability of the chosen identity code.
  useEffect(() => {
    if (!sex || !color || !word) {
      setAvailability("idle");
      return;
    }
    setAvailability("checking");
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const r = await apiJson<{ valid: boolean; available: boolean }>(
          `/api/code-check?sex=${sex}&color=${encodeURIComponent(color)}&word=${encodeURIComponent(word)}`
        );
        if (!cancelled) setAvailability(r.valid ? (r.available ? "free" : "taken") : "idle");
      } catch {
        if (!cancelled) setAvailability("idle");
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [sex, color, word]);

  const surprise = async () => {
    if (!sex) {
      toast.error("Piliin muna ang sex para tamang flower/animal ang lumabas.");
      return;
    }
    setSurprising(true);
    try {
      const r = await apiJson<{ color: string; word: string }>(`/api/random-code?sex=${sex}`);
      setColor(r.color);
      setWord(r.word);
      setErrors((prev) => ({ ...prev, color: undefined, word: undefined }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "May naganap na error. Pakisubok muli.");
    } finally {
      setSurprising(false);
    }
  };

  const nameDone = firstName.trim().length >= 2 && lastName.trim().length >= 2;
  const codeDone = !!sex && !!color && !!word && availability !== "taken";
  const pinDone = /^\d{6}$/.test(pin) && pin === pinConfirm;
  const stepsDone = [nameDone, codeDone, pinDone].filter(Boolean).length;

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
    if (availability === "taken") errs.word = "May kumuha na ng code na ito. Pumili ng ibang combination.";
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
      lsRemove("mm-draft-register");
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
          {/* Progress */}
          <div className="mb-5" role="status" aria-live="polite">
            <div className="flex items-center justify-between text-xs font-semibold text-xmas-forest">
              <span>{stepsDone >= 3 ? "Handa ka na! 🎉" : `Hakbang ${stepsDone + 1} ng 3`}</span>
              <span className="text-muted-foreground">{stepsDone} / 3 tapos na</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-xmas-gold transition-all duration-300"
                style={{ width: `${(stepsDone / 3) * 100}%` }}
              />
            </div>
            <ol className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] font-medium">
              {[
                { label: "Pangalan", done: nameDone },
                { label: "Identity Code", done: codeDone },
                { label: "PIN", done: pinDone },
              ].map((st) => (
                <li key={st.label} className={st.done ? "text-xmas-forest" : "text-muted-foreground"}>
                  {st.done ? <Check className="mr-0.5 inline h-3 w-3" aria-hidden /> : null}
                  {st.label}
                </li>
              ))}
            </ol>
          </div>
          <form id="register-form" onSubmit={handleSubmit} noValidate className="space-y-6">
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
                    allowCustom
                    customKind="color"
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
                    allowCustom
                    customKind={sex === "female" ? "flower" : "animal"}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium" aria-live="polite">
                  {availability === "checking" && <span className="text-muted-foreground">Chine-check kung available…</span>}
                  {availability === "free" && <span className="text-xmas-forest">✅ Available pa ang code na ito!</span>}
                  {availability === "taken" && <span className="text-destructive">❌ May kumuha na — pumili ng iba.</span>}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={surprise}
                  disabled={surprising}
                  className="min-h-11 gap-2 rounded-lg border-xmas-gold/60 text-xmas-forest hover:bg-accent"
                >
                  {surprising ? <Loader2 className="animate-spin" aria-hidden /> : <Dices aria-hidden />} Surprise me!
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                May <span className="font-semibold text-xmas-forest">search box</span> sa bawat
                dropdown — i-type lang (e.g. "gum" para sa Gumamela). Kung wala sa listahan ang
                gusto mo, i-type ang sarili mo at pindutin ang{" "}
                <span className="font-semibold text-xmas-forest">“Gamitin ang …”</span>. Pumili ng
                combination na unique — kung may kumuha na, magsusubmit kami ng error at pumili ka
                ng iba.
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
                  <PinInput
                    id="pin-input"
                    value={pin}
                    onChange={(v) => {
                      setPin(v);
                      setErrors((prev) => ({ ...prev, pin: undefined }));
                    }}
                    ariaLabel="6-digit PIN"
                    invalid={!!errors.pin}
                  />
                  {errors.pin && <p className="text-xs font-medium text-destructive">{errors.pin}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pin-confirm-input" className="text-xs text-muted-foreground">
                    Kumpirmahin ang PIN
                  </Label>
                  <PinInput
                    id="pin-confirm-input"
                    value={pinConfirm}
                    onChange={(v) => {
                      setPinConfirm(v);
                      setErrors((prev) => ({ ...prev, pinConfirm: undefined }));
                    }}
                    ariaLabel="Kumpirmahin ang 6-digit PIN"
                    invalid={!!errors.pinConfirm}
                  />
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
              className="hidden min-h-12 w-full rounded-lg bg-xmas-forest text-base font-semibold text-xmas-cream hover:bg-xmas-pine sm:inline-flex"
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

      {/* Phone: submit button stays visible while scrolling the long form */}
      {!registrationClosed && (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-xmas-cream/95 px-4 py-3 backdrop-blur sm:hidden no-print">
          <Button
            type="submit"
            form="register-form"
            disabled={submitting}
            className="min-h-12 w-full rounded-lg bg-xmas-forest text-base font-semibold text-xmas-cream hover:bg-xmas-pine"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden /> Nagre-register…
              </>
            ) : (
              <>
                Register &amp; Proceed <ArrowRight aria-hidden />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
