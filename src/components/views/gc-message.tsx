"use client";

// GC Post — handa nang i-post na mga mensahe para sa church GC (Messenger
// group chat). Naglalabas ito ng mga Taglish announcement na akmang-akma sa
// kasalukuyang phase ng event, awtomatikong may kasamang app link at
// pinakabagong bilang ng participants. Isang "I-post ngayon" badge ang
// gumagabay sa admin kung aling mensahe ang tama para ngayon.
//
// Contract: default export GcMessageView({ ctx }: { ctx: AppCtx }) —
// self-contained fetch ng /api/admin/overview (cookie-based admin auth).

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  HelpCircle,
  Lock,
  Megaphone,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { AppCtx } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { ChristmasCard, SectionTitle } from "@/components/decor";
import { FELLOWSHIP_DATE } from "@/lib/event-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (mirror of /api/admin/overview — keeps this view decoupled)
// ---------------------------------------------------------------------------

interface Overview {
  event: {
    eventName: string;
    budgetMin: number;
    budgetMax: number;
    registrationOpen: boolean;
    submissionsLocked: boolean;
    randomizationStatus: "not_started" | "completed" | "released";
    lockedAt: string | null;
    releasedAt: string | null;
  };
  totals: {
    participants: number;
    submitted: number;
    pending: number;
    sampleParticipants: number;
    duplicateCodes: number;
  };
}

type Phase = "open" | "locked" | "drawn" | "released";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const errMsg = (err: unknown, fallback = "May error sa server. Pakisubok muli.") =>
  err instanceof Error ? err.message : fallback;

/** Clipboard write with a legacy fallback (old phone browsers / http). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function phaseOf(ev: Overview["event"] | AppCtx["event"]): Phase {
  if (!ev) return "open";
  if (ev.randomizationStatus === "released") return "released";
  if (ev.submissionsLocked) {
    return ev.randomizationStatus === "completed" ? "drawn" : "locked";
  }
  return "open";
}

const PHASE_LABELS: Record<Phase, string> = {
  open: "Bukas ang registration",
  locked: "Naka-lock ang submissions",
  drawn: "Tapos na ang bunutan — hindi pa released",
  released: "Released na ang assignments",
};

// ---------------------------------------------------------------------------
// Message definitions
// ---------------------------------------------------------------------------

interface GcMessage {
  id: string;
  title: string;
  when: string;
  icon: ReactNode;
  text: string;
}

function buildMessages(opts: {
  appUrl: string;
  count: number;
  phase: Phase;
  budgetMin: number;
  budgetMax: number;
}): GcMessage[] {
  const { appUrl, count, phase, budgetMin, budgetMax } = opts;
  const url = appUrl || "(dito lalabas ang app link kapag na-open mo na ang app)";
  const n = count > 0 ? String(count) : "marami";
  const peso = `₱${budgetMin} hanggang ₱${budgetMax}`;

  return [
    {
      id: "announce-open",
      title: "Announcement: Bukas ang registration",
      when: "I-post sa simula ng Monito-Monita para maabiso agad ang buong GC.",
      icon: <Megaphone className="h-5 w-5" aria-hidden />,
      text: `🎄 CHRISTMAS FELLOWSHIP — MONITO-MONITA 🎄

Maligayang Pasko, mga kapatid!

Bukas na ang registration para sa ating Monito-Monita!

Paano sumali:
1. Buksan ang app: ${url}
2. Pindutin ang gift box para mag-register
3. I-type ang First name at Last name mo
4. Piliin kung Male o Female ka
5. Pumili ng identity code mo — kulay at bulaklak (para sa babae) o kulay at hayop (para sa lalake), hal. "Pink Gumamela"
6. Gumawa ng 6-digit PIN mo — ito ang sign-in mo sa app, kaya tandaan ito!
7. Isulat ang wishlist mo — ${peso} ang budget, hanggang 3 items

Sa ${FELLOWSHIP_DATE}, sa ating Christmas Fellowship, doon natin ibibigay ang mga regalo!

Sali na, mga kapatid! God bless po! 🙏`,
    },
    {
      id: "last-call",
      title: "Last call bago isara ang registration",
      when: "I-post kapag malapit na nating i-lock ang registration sa admin dashboard.",
      icon: <Bell className="h-5 w-5" aria-hidden />,
      text: `⏰ LAST CALL: Malapit na nating isara ang registration! 🎄

Mga kapatid, ${n} na tayo na nakarehistro!

Kung hindi ka pa nakapag-register, ito na ang tamang panahon:
1. Buksan ang app: ${url}
2. Pindutin ang gift box at i-register ang iyong pangalan
3. Gumawa ng 6-digit PIN mo
4. Isulat ang wishlist mo (${peso}, hanggang 3 items)

Nakapag-register na pero hindi pa tapos ang wishlist? Puwede pa 'yan i-edit — mag-sign in lang gamit ang First name + Last name + 6-digit PIN mo.

Sali na! God bless po! 🙏`,
    },
    {
      id: "closed",
      title: "Sarado na ang registration",
      when: "I-post pagkatapos i-lock ang submissions sa admin dashboard.",
      icon: <Lock className="h-5 w-5" aria-hidden />,
      text: `🔒 SARADO NA ANG REGISTRATION 🎄

Salamat po sa lahat ng nakalahok!

${n} tayo na ang sasali sa ating Monito-Monita. Susunod na hakbang: magbabunutan na tayo!

Abangan ang susunod na announcement para malaman kung sino ang monito/monita mo.

Kung may tanong o may nakalimutan, i-message lang po ang admin.

God bless po! 🙏`,
    },
    {
      id: "revealed",
      title: "Tapos na ang bunutan — i-check na!",
      when: "I-post pagkatapos i-release ang assignments sa admin dashboard.",
      icon: <Gift className="h-5 w-5" aria-hidden />,
      text: `🎁 TAPOS NA ANG BUNUTAN! 🎄

Merry Christmas, mga kapatid! Alamin na kung sino ang monito/monita mo!

1. Buksan ang app: ${url}
2. Pindutin ang "Check My Monito/Monita"
3. I-type ang First name at Last name mo
4. I-type ang 6-digit PIN mo

Makikita mo doon ang pangalan ng hahatian mo at ang kanyang wishlist para alam mo kung ano ang gusto niya. 🎁

Paalala: ${peso} lang ang budget — simple lang, basta galing sa puso!

Ibibigay ang mga regalo sa ating Christmas Fellowship sa ${FELLOWSHIP_DATE}. Kitakits! God bless po! 🙏`,
    },
    {
      id: "remind-gift",
      title: `Paalala: Ihanda ang gift — ${FELLOWSHIP_DATE}`,
      when: "I-post ilang araw bago ang Christmas Fellowship para handa na ang lahat.",
      icon: <Sparkles className="h-5 w-5" aria-hidden />,
      text: `🎄 PAALALA: Christmas Fellowship — ${FELLOWSHIP_DATE} 🎄

Mga kapatid, malapit na ang ating Christmas Fellowship!

• Ihanda na ang gift mo para sa monito/monita mo (${peso})
• Nakalimutan mo kung sino ang hahatian mo? I-check sa app: ${url}
• I-wrap o ihanda na ang regalo para sa ${FELLOWSHIP_DATE}!

Doon natin ibibigay ang mga regalo — kita-kits!

Huwag nating kalimutan ang tunay na kahulugan ng Pasko: ang kapanganakan ng ating Panginoong Hesus. Maligayang Pasko at God bless po sa ating lahat! 🙏✨`,
    },
    {
      id: "explainer",
      title: "Ano ang Monito-Monita?",
      when:
        phase === "open"
          ? "I-post kapag may nagtatanong kung ano ito o paano sumali."
          : "I-post kapag may nagtatanong kung ano ang Monito-Monita.",
      icon: <HelpCircle className="h-5 w-5" aria-hidden />,
      text: `🎄 ANO ANG MONITO-MONITA? 🎄

Sa Monito-Monita, bawat kalahok ay may lihim na hahatian — monito kung lalake, monita kung babae.

• Surprise 'yan! Hindi mo sasabihin kung sino ang hahatian mo. 🎁
• Bago ang bunutan, isusulat mo ang wishlist mo (${peso}, hanggang 3 items) para alam ng monito/monita mo kung ano ang gusto mo.
• Sa ${FELLOWSHIP_DATE}, sa ating Christmas Fellowship, ibibigay ang mga regalo.

${
  phase === "open"
    ? `Bukas pa ang registration! Sumali sa app: ${url}`
    : "Kung gusto mong sumali, i-message ang admin para malaman kung bukas pa ang registration."
}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GcMessageView({ ctx }: { ctx: AppCtx }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [appUrl, setAppUrl] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiJson<Overview>("/api/admin/overview");
      setData(d);
    } catch (err: unknown) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The shareable app link — resolved client-side to avoid SSR mismatch.
  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  // Prefer the fresh admin overview; ctx.event is the pre-load fallback.
  const event = data?.event ?? ctx.event;
  const phase = useMemo(() => phaseOf(event), [event]);
  const messages = useMemo(
    () =>
      buildMessages({
        appUrl,
        count: data?.totals.participants ?? 0,
        phase,
        budgetMin: event?.budgetMin ?? 150,
        budgetMax: event?.budgetMax ?? 200,
      }),
    [appUrl, data, phase, event]
  );
  const recommendedId = phase === "released" ? "revealed" : phase === "open" ? "announce-open" : "closed";

  const handleCopy = useCallback(async (m: GcMessage) => {
    const ok = await copyText(m.text);
    if (ok) {
      setCopiedId(m.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === m.id ? null : cur)), 2500);
      toast.success("Nakopya na ang mensahe! I-paste lang sa GC ninyo.");
    } else {
      toast.error(
        "Hindi nakopya. Pindutin nang matagal ang teksto ng mensahe, tapos i-copy manually."
      );
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SectionTitle icon={<Megaphone className="h-5 w-5 text-xmas-forest" aria-hidden />}>
          GC Post
        </SectionTitle>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Handa nang i-post na mga mensahe para sa church GC ninyo (Messenger group chat).
          Pindutin ang <strong>Kopyahin ang mensahe</strong>, tapos i-paste na lang sa GC.
          Awtomatikong kasama sa bawat mensahe ang app link, ang bilang ng participants, at
          ang Christmas Fellowship date.
        </p>
      </div>

      {/* Live status strip */}
      <ChristmasCard className="p-4 sm:p-6">
        {loading && !data ? (
          <div className="space-y-2" aria-busy="true" aria-label="Naglo-load ang event status">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-full max-w-md" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge
                className={cn(
                  "gap-1.5 border px-3 py-1.5 text-sm font-semibold",
                  phase === "released" && "border-xmas-forest/40 bg-xmas-forest/10 text-xmas-forest",
                  phase === "open" && "border-xmas-forest/40 bg-xmas-forest/10 text-xmas-forest",
                  phase === "locked" && "border-xmas-burgundy/40 bg-xmas-burgundy/10 text-xmas-burgundy",
                  phase === "drawn" && "border-xmas-gold/60 bg-xmas-gold/20 text-[#8a6d10]"
                )}
              >
                {phase === "open" && <Sparkles className="h-4 w-4" aria-hidden />}
                {phase === "locked" && <Lock className="h-4 w-4" aria-hidden />}
                {phase === "drawn" && <Gift className="h-4 w-4" aria-hidden />}
                {phase === "released" && <CheckCircle2 className="h-4 w-4" aria-hidden />}
                {PHASE_LABELS[phase]}
              </Badge>
              {data && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-xmas-forest" aria-hidden />
                    <strong className="text-foreground">{data.totals.participants}</strong>
                    participants
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-xmas-forest" aria-hidden />
                    <strong className="text-foreground">{data.totals.submitted}</strong> may wishlist
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-xmas-gold" aria-hidden />
                    <strong className="text-foreground">{data.totals.pending}</strong> pending
                  </span>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                className="ml-auto min-h-11 gap-2"
                onClick={() => void load()}
                aria-label="I-refresh ang bilang ng participants"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
                Refresh
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Gabay: habang <strong>bukas</strong> ang registration, i-post ang "Bukas ang
              registration" o "Last call". Pagkatapos i-lock, i-post ang "Sarado na". Pagkatapos
              i-release, i-post ang "Tapos na ang bunutan".
            </p>
          </>
        )}
      </ChristmasCard>

      {/* Message cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {messages.map((m) => {
          const isRecommended = m.id === recommendedId;
          const copied = copiedId === m.id;
          return (
            <ChristmasCard
              key={m.id}
              className={cn("flex flex-col p-4 sm:p-6", isRecommended && "ring-2 ring-xmas-gold/50")}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-xmas-forest/10 text-xmas-forest">
                  {m.icon}
                </span>
                <h3 className="font-heading text-lg font-bold text-xmas-forest">{m.title}</h3>
                {isRecommended && (
                  <Badge className="ml-auto gap-1 border-xmas-gold/60 bg-xmas-gold/20 text-[#8a6d10]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    I-post ngayon
                  </Badge>
                )}
              </div>
              <p className="mb-3 text-xs text-muted-foreground sm:text-sm">{m.when}</p>
              <pre
                className="nice-scroll max-h-72 select-text whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-4 text-sm leading-relaxed text-foreground"
                aria-label={`Mensahe para sa GC: ${m.title}`}
              >
                {m.text}
              </pre>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  className={cn(
                    "min-h-11 gap-2",
                    copied && "border-xmas-forest/40 bg-xmas-forest/10 text-xmas-forest hover:bg-xmas-forest/15"
                  )}
                  variant={copied ? "outline" : "default"}
                  onClick={() => void handleCopy(m)}
                  aria-label={`Kopyahin ang mensahe: ${m.title}`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden />
                      Nakopya na!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden />
                      Kopyahin ang mensahe
                    </>
                  )}
                </Button>
              </div>
            </ChristmasCard>
          );
        })}
      </div>
    </div>
  );
}
