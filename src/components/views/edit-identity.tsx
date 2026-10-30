"use client";

// Lets a signed-in participant change their identity code (color + flower/animal)
// while registration is open. Values can come from the list or be typed in.
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { AppCtx } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { ANIMALS, COLORS, FLOWERS } from "@/lib/words";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChristmasCard, SectionTitle } from "@/components/decor";
import { Combobox } from "@/components/combobox";

interface MeResponse {
  identityCode: string;
  sex: string;
}

export default function EditIdentityView({ ctx }: { ctx: AppCtx }) {
  const { navigate, session, setSession, event } = ctx;
  const [sex, setSex] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState(session?.identityCode ?? "");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [color, setColor] = useState("");
  const [word, setWord] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      navigate("welcome");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await apiJson<MeResponse>("/api/me", { token: session.token });
        if (cancelled) return;
        setSex(me.sex);
        setCurrentCode(me.identityCode);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "May naganap na error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, navigate]);

  if (!session) return null;

  const female = sex === "female";
  const kind = female ? "flower" : "animal";
  const preview = color && word ? `${color} ${word}` : null;
  const closed = !!event && !event.registrationOpen;

  const save = async () => {
    if (saving) return;
    if (!color || !word) {
      setError(`Pumili o mag-type ng color at ${kind}.`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const data = await apiJson<{ identityCode: string; changed: boolean }>("/api/me/identity", {
        method: "PATCH",
        token: session.token,
        body: JSON.stringify({ color, word }),
      });
      setSession({ ...session, identityCode: data.identityCode });
      toast.success(
        data.changed ? `Na-update na ang code mo: ${data.identityCode} 🎄` : "Pareho pa rin ang code mo."
      );
      navigate("menu");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "May naganap na error. Pakisubok muli.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate("menu")}
        className="min-h-11 gap-2 rounded-lg px-3 text-xmas-forest hover:bg-accent"
      >
        <ArrowLeft aria-hidden /> Bumalik sa Menu
      </Button>

      <SectionTitle icon={<Star className="h-5 w-5 fill-xmas-gold text-xmas-gold" aria-hidden />}>
        Edit Identity Code
      </SectionTitle>

      <ChristmasCard className="space-y-5 p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          Kasalukuyang code mo:{" "}
          <span className="font-heading text-base font-bold text-xmas-forest">{currentCode}</span>
        </p>

        {closed && (
          <p className="rounded-lg border border-xmas-burgundy/40 bg-xmas-burgundy/10 p-3 text-sm font-medium text-xmas-burgundy">
            Sarado na ang registration kaya hindi na puwedeng palitan ang code. Pakicontact ang admin.
          </p>
        )}

        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Kinukuha ang details mo…
          </p>
        )}
        {loadError && <p className="text-sm font-medium text-destructive">{loadError}</p>}

        {!loading && !loadError && sex && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-color" className="text-xs text-muted-foreground">
                  Bagong Color
                </Label>
                <Combobox
                  id="edit-color"
                  options={COLORS}
                  value={color}
                  onChange={setColor}
                  placeholder="Pumili ng color"
                  searchPlaceholder="I-type ang color…"
                  allowCustom
                  customKind="color"
                  disabled={closed}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-word" className="text-xs text-muted-foreground">
                  Bagong {female ? "Flower" : "Animal"}
                </Label>
                <Combobox
                  id="edit-word"
                  options={female ? FLOWERS : ANIMALS}
                  value={word}
                  onChange={setWord}
                  placeholder={`Pumili ng ${kind}`}
                  searchPlaceholder={`I-type ang ${kind}…`}
                  allowCustom
                  customKind={kind}
                  disabled={closed}
                />
              </div>
            </div>

            <div
              className="flex min-h-[64px] items-center justify-center gap-2 rounded-lg border border-dashed border-xmas-gold bg-xmas-gold/10 p-4"
              aria-live="polite"
            >
              {preview ? (
                <span className="font-heading text-2xl font-bold text-xmas-forest sm:text-3xl">{preview}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Pumili ng bagong color at {kind}…</span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Kung wala sa listahan ang gusto mo, i-type ang sarili mo at pindutin ang “Gamitin ang …”. Kailangan
              unique ang code — kung may kumuha na, pumili ng iba.
            </p>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button
              onClick={save}
              disabled={saving || closed}
              className="min-h-12 w-full rounded-lg bg-xmas-forest text-base font-semibold text-xmas-cream hover:bg-xmas-pine"
            >
              {saving ? <Loader2 className="animate-spin" aria-hidden /> : null} I-save ang bagong code
            </Button>
          </>
        )}
      </ChristmasCard>
    </div>
  );
}
