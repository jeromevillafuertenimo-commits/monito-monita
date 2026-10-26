"use client";

// Admin dashboard — 6-tab control center for the Monito-Monita exchange gift.
// Contract: single default export AdminDashboardView({ ctx }: { ctx: AppCtx }).
// All tab content lives in non-exported component functions in this file.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  Download,
  Eye,
  FileDown,
  History,
  Info,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Trash2,
  TriangleAlert,
  Unlock,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { AppCtx, WishlistDTO } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChristmasCard, SectionTitle } from "@/components/decor";
import GcMessageView from "@/components/views/gc-message";
import { COLORS, FLOWERS, ANIMALS } from "@/lib/words";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Types (mirroring the API contract in worklog.md)
// ---------------------------------------------------------------------------

type RandomizationStatus = "not_started" | "completed" | "released";

interface AdminEvent {
  eventName: string;
  budgetMin: number;
  budgetMax: number;
  registrationOpen: boolean;
  submissionsLocked: boolean;
  randomizationStatus: RandomizationStatus;
  lockedAt: string | null;
  releasedAt: string | null;
  lockedBy: string | null;
  releasedBy: string | null;
}

interface Overview {
  event: AdminEvent;
  totals: {
    participants: number;
    submitted: number;
    pending: number;
    sampleParticipants: number;
    duplicateCodes: number;
  };
  canRandomize: boolean;
  blockers: string[];
  pendingCodes?: string[];
}

interface ParticipantRow {
  id: number | string;
  firstName: string;
  lastName: string;
  sex: "male" | "female";
  identityCode: string;
  pin: string | null; // admin-only: plain 6-digit PIN for support
  isSample: boolean;
  createdAt: string;
  wishlistSubmitted: boolean;
  submittedAt: string | null;
  wishlist: WishlistDTO | null;
}

interface AssignmentsData {
  released: boolean;
  releasedAt: string | null;
  batchId: string | null;
  assignments: {
    giver: { name: string; code: string };
    recipient: { name: string; code: string };
    wishes: { name: string; details: string }[];
  }[];
}

type AssignmentRow = AssignmentsData["assignments"][number];

interface AuditData {
  logs: {
    id: number;
    actor: string;
    action: string;
    details: string;
    recordId: string | null;
    createdAt: string;
  }[];
}

interface TabProps {
  version: number;
  onMutate: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—";

const fmtShort = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const errMsg = (err: unknown, fallback = "May error sa server. Pakisubok muli.") =>
  err instanceof Error ? err.message : fallback;

function wishesFrom(dto: WishlistDTO): { name: string | null; details: string | null }[] {
  return [
    { name: dto.wish1Name, details: dto.wish1Details },
    { name: dto.wish2Name, details: dto.wish2Details },
    { name: dto.wish3Name, details: dto.wish3Details },
  ];
}

/** Fetches admin JSON on mount and whenever `version` changes. */
function useAdminFetch<T>(url: string, version: number) {
  const [state, setState] = useState<{ data: T | null; fetchedVersion: number }>({
    data: null,
    fetchedVersion: -1,
  });
  const loading = state.fetchedVersion !== version;

  useEffect(() => {
    let cancelled = false;
    apiJson<T>(url)
      .then((d) => {
        if (!cancelled) setState({ data: d, fetchedVersion: version });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast.error(errMsg(err));
          setState((prev) => ({ ...prev, fetchedVersion: version }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url, version]);

  return { data: state.data, loading };
}

// ---------------------------------------------------------------------------
// Small shared UI pieces (not exported)
// ---------------------------------------------------------------------------

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Naglo-load ang table">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function CardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone: "forest" | "gold" | "burgundy" | "safe";
}) {
  const tones: Record<typeof tone, string> = {
    forest: "bg-xmas-forest/10 text-xmas-forest",
    gold: "bg-xmas-gold/15 text-[#8a6d10]",
    burgundy: "bg-xmas-burgundy/10 text-xmas-burgundy",
    safe: "bg-[#2d6a4f]/10 text-[#2d6a4f]",
  };
  return (
    <ChristmasCard className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate font-heading text-2xl font-bold text-xmas-forest sm:text-3xl">
            {value}
          </p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            tones[tone]
          )}
          aria-hidden
        >
          {icon}
        </span>
      </div>
    </ChristmasCard>
  );
}

function WishListItems({
  wishes,
}: {
  wishes: { name: string | null; details: string | null }[];
}) {
  return (
    <ol className="space-y-2.5">
      {wishes.map((w, i) => (
        <li key={i} className="rounded-lg border bg-muted/40 p-3">
          <p className="text-sm font-semibold text-xmas-forest">
            {i + 1}. {w.name?.trim() || "—"}
          </p>
          {w.details?.trim() ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{w.details}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard view
// ---------------------------------------------------------------------------

export default function AdminDashboardView({ ctx }: { ctx: AppCtx }) {
  const { navigate, refreshEvent } = ctx;
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Session gate — kick back to login if the admin cookie is gone.
  useEffect(() => {
    let cancelled = false;
    apiJson<{ username: string }>("/api/admin/session")
      .then((d) => {
        if (!cancelled) setAdminUsername(d.username);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Kailangan mag-login mula.");
          navigate("admin-login");
        }
      })
      .finally(() => {
        if (!cancelled) setSessionChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  /** After any mutation: refresh shared event state + all current-tab data. */
  const onMutate = useCallback(async () => {
    await refreshEvent();
    setDataVersion((v) => v + 1);
  }, [refreshEvent]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshEvent();
      setDataVersion((v) => v + 1);
      toast.success("Na-refresh na ang data.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiJson("/api/admin/logout", { method: "POST" });
      toast.success("Naka-logout na. Ingat!");
      navigate("admin-login");
    } catch (err) {
      toast.error(errMsg(err, "Hindi matuloy ang logout. Pakisubok muli."));
    } finally {
      setLoggingOut(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-xmas-gold" aria-hidden />
        <p className="text-sm text-muted-foreground">Sinusuri ang admin session…</p>
      </div>
    );
  }

  if (!adminUsername) return null; // already navigating back to login

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle icon={<ShieldCheck className="h-6 w-6 text-xmas-forest" aria-hidden />}>
          Admin Dashboard
        </SectionTitle>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <Badge
            variant="outline"
            className="gap-1.5 border-xmas-gold/50 bg-xmas-gold/10 px-2.5 py-1 text-foreground"
          >
            <UserRound className="h-3.5 w-3.5 text-xmas-gold" aria-hidden />
            {adminUsername}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xmas-burgundy hover:bg-xmas-burgundy/10 hover:text-xmas-burgundy"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden />
            )}
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="nice-scroll -mx-4 overflow-x-auto px-4 pb-1 no-print sm:mx-0 sm:px-0">
          <TabsList className="inline-flex min-w-max gap-1">
            <TabsTrigger value="overview" className="whitespace-nowrap">
              Overview
            </TabsTrigger>
            <TabsTrigger value="gc" className="whitespace-nowrap">
              GC Post
            </TabsTrigger>
            <TabsTrigger value="participants" className="whitespace-nowrap">
              Participants
            </TabsTrigger>
            <TabsTrigger value="lock" className="whitespace-nowrap">
              Lock &amp; Validation
            </TabsTrigger>
            <TabsTrigger value="randomize" className="whitespace-nowrap">
              Randomization
            </TabsTrigger>
            <TabsTrigger value="release" className="whitespace-nowrap">
              Release
            </TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap">
              Settings &amp; Audit
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 sm:mt-6">
          <OverviewTab version={dataVersion} onMutate={onMutate} />
        </TabsContent>
        <TabsContent value="gc" className="mt-4 sm:mt-6">
          <GcMessageView ctx={ctx} />
        </TabsContent>
        <TabsContent value="participants" className="mt-4 sm:mt-6">
          <ParticipantsTab version={dataVersion} onMutate={onMutate} />
        </TabsContent>
        <TabsContent value="lock" className="mt-4 sm:mt-6">
          <LockTab version={dataVersion} onMutate={onMutate} />
        </TabsContent>
        <TabsContent value="randomize" className="mt-4 sm:mt-6">
          <RandomizeTab version={dataVersion} onMutate={onMutate} />
        </TabsContent>
        <TabsContent value="release" className="mt-4 sm:mt-6">
          <ReleaseTab version={dataVersion} onMutate={onMutate} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4 sm:mt-6">
          <SettingsTab version={dataVersion} onMutate={onMutate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ version }: TabProps) {
  const { data, loading } = useAdminFetch<Overview>("/api/admin/overview", version);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <CardGridSkeleton />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { event, totals, canRandomize, blockers, pendingCodes } = data;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Registered"
          value={totals.participants}
          sub="participants sa event"
          tone="forest"
        />
        <StatCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Wishlists Submitted"
          value={totals.submitted}
          sub={`of ${totals.participants} participants`}
          tone="gold"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Wishlists"
          value={totals.pending}
          sub={totals.pending > 0 ? "Kailangan pa i-follow up" : "Kumpleto na!"}
          tone={totals.pending > 0 ? "burgundy" : "safe"}
        />
        <StatCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Duplicate Codes"
          value={totals.duplicateCodes === 0 ? "0 — safe!" : totals.duplicateCodes}
          sub={totals.duplicateCodes === 0 ? "Walang conflict sa codes" : "May conflict — ayusin muna"}
          tone={totals.duplicateCodes === 0 ? "safe" : "burgundy"}
        />
      </div>

      {/* Status cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ChristmasCard className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Registration
            </p>
            <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          {event.registrationOpen ? (
            <Badge className="mt-2 bg-[#2d6a4f] text-white">Open</Badge>
          ) : (
            <Badge
              variant="outline"
              className="mt-2 border-xmas-burgundy/50 bg-xmas-burgundy/10 text-xmas-burgundy"
            >
              Closed
            </Badge>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {event.registrationOpen
              ? "Puwede pang sumali ang bagong participants."
              : "Sarado na — fixed na ang lineup."}
          </p>
        </ChristmasCard>

        <ChristmasCard className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Submissions
            </p>
            <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          {event.submissionsLocked ? (
            <>
              <Badge className="mt-2 bg-xmas-burgundy text-white">LOCKED</Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                since {fmt(event.lockedAt)}
                {event.lockedBy ? ` by ${event.lockedBy}` : ""}
              </p>
            </>
          ) : (
            <>
              <Badge
                variant="outline"
                className="mt-2 border-xmas-forest/30 bg-xmas-forest/10 text-xmas-forest"
              >
                Open
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                Puwede pa i-edit ang wishlists ng participants.
              </p>
            </>
          )}
        </ChristmasCard>

        <ChristmasCard className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Randomization
            </p>
            <Shuffle className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          {event.randomizationStatus === "not_started" ? (
            <Badge variant="outline" className="mt-2">
              Not Started
            </Badge>
          ) : event.randomizationStatus === "completed" ? (
            <Badge className="mt-2 bg-xmas-gold text-white">Completed</Badge>
          ) : (
            <Badge className="mt-2 bg-[#2d6a4f] text-white">RELEASED</Badge>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {event.randomizationStatus === "released"
              ? `Released ${fmt(event.releasedAt)}${event.releasedBy ? ` by ${event.releasedBy}` : ""}`
              : event.randomizationStatus === "completed"
                ? "Tapos na ang bunutan — ready para i-release."
                : "Hindi pa tumatakbo ang bunutan."}
          </p>
        </ChristmasCard>
      </div>

      {/* Blockers / ready banner */}
      {blockers.length > 0 ? (
        <Alert variant="destructive" className="border-xmas-burgundy/40">
          <TriangleAlert />
          <AlertTitle>Hindi pa pwede ang randomization:</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : canRandomize ? (
        <Alert className="border-[#2d6a4f]/40 bg-[#2d6a4f]/5 text-[#2d6a4f] [&>svg]:text-[#2d6a4f]">
          <CheckCircle2 />
          <AlertTitle>Ready na ang lahat para sa official bunutan! 🎉</AlertTitle>
        </Alert>
      ) : null}

      {/* Pending wishlists chips */}
      {pendingCodes && pendingCodes.length > 0 && (
        <ChristmasCard className="p-4 sm:p-6">
          <p className="text-sm font-semibold text-xmas-forest">
            Mga participants na hindi pa nag-submit ng wishlist ({pendingCodes.length}):
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pendingCodes.map((c) => (
              <code
                key={c}
                className="rounded border border-xmas-burgundy/30 bg-xmas-burgundy/5 px-2 py-0.5 font-mono text-xs text-xmas-burgundy"
              >
                {c}
              </code>
            ))}
          </div>
        </ChristmasCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Participants tab
// ---------------------------------------------------------------------------

type ParticipantFilter = "all" | "submitted" | "pending" | "sample";

function ParticipantsTab({ version, onMutate }: TabProps) {
  const { data, loading } = useAdminFetch<{ participants: ParticipantRow[] }>(
    "/api/admin/participants",
    version
  );
  // Randomization status decides whether the bunutan RESULTS export is shown.
  const overview = useAdminFetch<Overview>("/api/admin/overview", version);
  const randomizationStatus = overview.data?.event.randomizationStatus ?? "not_started";
  const bunutanDone = randomizationStatus === "completed" || randomizationStatus === "released";

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ParticipantFilter>("all");
  const [wishRow, setWishRow] = useState<ParticipantRow | null>(null);
  const [resetTarget, setResetTarget] = useState<ParticipantRow | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  // Manual add-participant form (para sa mga kasamang hindi maka-register online)
  const [addOpen, setAddOpen] = useState(false);
  const [addFirst, setAddFirst] = useState("");
  const [addLast, setAddLast] = useState("");
  const [addSex, setAddSex] = useState("");
  const [addColor, setAddColor] = useState("");
  const [addWord, setAddWord] = useState("");
  const [addPin, setAddPin] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addWishes, setAddWishes] = useState([
    { name: "", details: "" },
    { name: "", details: "" },
    { name: "", details: "" },
  ]);

  // Editable wishlist dialog (rescue path kapag naka-lock na ang submissions)
  const [wishDraft, setWishDraft] = useState([
    { name: "", details: "" },
    { name: "", details: "" },
    { name: "", details: "" },
  ]);
  const [wishBusy, setWishBusy] = useState(false);

  const participants = data?.participants ?? [];
  const filtered = participants.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesQ =
      !q ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      `${p.firstName}${p.lastName}`.toLowerCase().includes(q) ||
      p.identityCode.toLowerCase().includes(q) ||
      (p.pin ?? "").includes(q); // hanapin kung kanino ang isang PIN
    const matchesStatus =
      filter === "all" ||
      (filter === "submitted" && p.wishlistSubmitted) ||
      (filter === "pending" && !p.wishlistSubmitted) ||
      (filter === "sample" && p.isSample);
    return matchesQ && matchesStatus;
  });

  // Kapag tapos na ang bunutan, bawal nang magdagdag (masisira ang assignments)
  // at bawal na ring i-edit ang mga wishlist.
  const canAddParticipants = randomizationStatus === "not_started";
  const canEditWishes = randomizationStatus === "not_started";

  const openWishlist = (p: ParticipantRow) => {
    // Prefill the draft from the stored wishlist (or blanks) — the dialog is
    // editable while the bunutan hasn't run, read-only afterwards.
    setWishDraft(
      p.wishlist
        ? wishesFrom(p.wishlist).map((w) => ({ name: w.name ?? "", details: w.details ?? "" }))
        : [
            { name: "", details: "" },
            { name: "", details: "" },
            { name: "", details: "" },
          ]
    );
    setWishRow(p);
  };

  const saveWishlist = async () => {
    if (!wishRow || wishBusy) return;
    if (!wishDraft.some((w) => w.name.trim())) {
      toast.error("Kailangan ng kahit isang gift wish na may name.");
      return;
    }
    setWishBusy(true);
    try {
      await apiJson(`/api/admin/participants/${wishRow.id}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishes: wishDraft }),
      });
      toast.success(`Na-save ang wishlist ni ${wishRow.identityCode}! 🎁`);
      setWishRow(null);
      void onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setWishBusy(false);
    }
  };

  const confirmResetPin = async () => {
    if (!resetTarget || resetBusy) return;
    if (!/^\d{6}$/.test(resetPin)) {
      toast.error("Pakilagay ang bagong PIN (numbers lang, eksaktong 6 digits).");
      return;
    }
    setResetBusy(true);
    try {
      await apiJson(`/api/admin/participants/${resetTarget.id}/reset-pin`, {
        method: "POST",
        body: JSON.stringify({ pin: resetPin }),
      });
      toast.success(
        `Na-reset ang PIN ni ${resetTarget.identityCode}! Isulat at iabot ang bagong PIN sa kanya.`
      );
      setResetTarget(null);
      setResetPin("");
      void onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setResetBusy(false);
    }
  };

  const submitAddParticipant = async () => {
    if (addBusy) return;
    if (!addFirst.trim() || !addLast.trim()) {
      toast.error("Pakilagay ang First name at Last name ng participant.");
      return;
    }
    if (!addSex) {
      toast.error("Piliin ang sex: Babae (Female) o Lalaki (Male).");
      return;
    }
    if (!addColor) {
      toast.error("Pumili ng color para sa identity code.");
      return;
    }
    if (!addWord) {
      toast.error(
        addSex === "female"
          ? "Pumili ng flower para sa identity code."
          : "Pumili ng animal para sa identity code."
      );
      return;
    }
    if (!/^\d{6}$/.test(addPin)) {
      toast.error("Pakicomplete ang 6-digit PIN (numbers lang, eksaktong 6 digits).");
      return;
    }
    setAddBusy(true);
    try {
      // Wishlist rows are optional: only send them when the admin typed
      // anything — kapag blanko lahat, walang wishlist ang ma-cocreate.
      const hasWishInput = addWishes.some((w) => w.name.trim() || w.details.trim());
      await apiJson("/api/admin/participants", {
        method: "POST",
        body: JSON.stringify({
          firstName: addFirst.trim(),
          lastName: addLast.trim(),
          sex: addSex,
          color: addColor,
          word: addWord,
          pin: addPin,
          ...(hasWishInput ? { wishes: addWishes } : {}),
        }),
      });
      toast.success(
        `Naidagdag na si ${addFirst.trim()} ${addLast.trim()} (${addColor} ${addWord}) sa listahan! 🎉`
      );
      setAddOpen(false);
      setAddFirst("");
      setAddLast("");
      setAddSex("");
      setAddColor("");
      setAddWord("");
      setAddPin("");
      setAddWishes([
        { name: "", details: "" },
        { name: "", details: "" },
        { name: "", details: "" },
      ]);
      void onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 no-print sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name o code…"
            className="pl-8"
            aria-label="Search name o identity code"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as ParticipantFilter)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter participants">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sample">Sample only</SelectItem>
          </SelectContent>
        </Select>
        {bunutanDone && (
          <a href="/api/admin/export/assignments" download className="shrink-0">
            <Button
              className="h-10 w-full gap-1.5 border-[#2d6a4f]/40 bg-[#2d6a4f] px-3 font-semibold text-white hover:bg-[#2d6a4f]/90 sm:w-auto"
              title="I-download ang kumpletong resulta ng bunutan bilang CSV"
            >
              <Download className="h-4 w-4" aria-hidden />
              I-download ang Resulta ng Bunutan (CSV)
            </Button>
          </a>
        )}
        {canAddParticipants && (
          <Button
            onClick={() => setAddOpen(true)}
            className="h-10 w-full gap-1.5 bg-xmas-forest px-3 font-semibold text-xmas-cream hover:bg-xmas-pine sm:w-auto"
            title="Manually mag-input ng participant na hindi maka-register online"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Magdagdag ng Participant
          </Button>
        )}
        <a href="/api/admin/export/participants" download className="shrink-0">
          <Button variant="outline" className="h-10 w-full gap-1.5 px-3 sm:w-auto">
            <FileDown className="h-4 w-4" aria-hidden />
            I-download ang Listahan (CSV)
          </Button>
        </a>
      </div>

      {bunutanDone && (
        <Alert className="border-[#2d6a4f]/40 bg-[#2d6a4f]/5 text-[#2d6a4f] [&>svg]:text-[#2d6a4f]">
          <CheckCircle2 />
          <AlertDescription>
            Tapos na ang bunutan! I-download ang <strong>Resulta ng Bunutan</strong> para makita ang
            kumpletong lista — pangalan, identity code, sino ang pagbibigyan ng bawat isa, at ang
            wishes nila — naka-CSV na puwedeng i-print o i-share sa meeting.
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      {loading && participants.length === 0 ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="nice-scroll max-h-[65vh] overflow-auto rounded-lg border">
          <div className="min-w-[980px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Identity Code</TableHead>
                  <TableHead>6-Digit PIN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      {participants.length === 0 ? (
                        <div className="flex flex-col items-center gap-2">
                          <span>Wala pang participants sa listahan.</span>
                          <span className="text-xs">
                            Pindutin ang “Magdagdag ng Participant” para manually mag-input, o
                            mag-register ang mga kasama sa Home page.
                          </span>
                        </div>
                      ) : (
                        "Walang nahanap na tugma sa search/filter."
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.firstName}</TableCell>
                      <TableCell>{p.lastName}</TableCell>
                      <TableCell>{p.sex === "female" ? "Babae" : "Lalaki"}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs font-bold text-xmas-forest">
                        {p.identityCode}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs font-bold tracking-[0.2em] text-xmas-burgundy">
                        {p.pin ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.wishlistSubmitted ? (
                            <Badge className="border border-[#2d6a4f]/30 bg-[#2d6a4f]/10 text-[#2d6a4f]">
                              Submitted
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-500/50 bg-amber-500/10 text-amber-700"
                            >
                              Pending
                            </Badge>
                          )}
                          {p.isSample && (
                            <Badge
                              variant="outline"
                              className="border-xmas-burgundy/50 text-xmas-burgundy"
                            >
                              SAMPLE
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {fmt(p.submittedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 px-2.5"
                            aria-label={`View wishlist ni ${p.identityCode}`}
                            onClick={() => openWishlist(p)}
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                            Wishlist
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 px-2.5"
                            aria-label={`I-reset ang PIN ni ${p.identityCode}`}
                            onClick={() => {
                              setResetPin("");
                              setResetTarget(p);
                            }}
                          >
                            <KeyRound className="h-4 w-4" aria-hidden />
                            I-reset ang PIN
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Wishlist dialog — editable before the bunutan, read-only after */}
      <Dialog open={!!wishRow} onOpenChange={(o) => !o && !wishBusy && setWishRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wishlist ni {wishRow?.identityCode}</DialogTitle>
            <DialogDescription>
              {canEditWishes
                ? "Puwede mong ilagay o ayusin ang wishlist dito — lalo nang kapag naka-lock na ang submissions at hindi na siya makakapag-submit. Kailangan ng kahit isang wish na may name."
                : wishRow
                  ? `${wishRow.firstName} ${wishRow.lastName} • submitted ${fmt(wishRow.submittedAt)}`
                  : ""}
            </DialogDescription>
          </DialogHeader>
          {canEditWishes ? (
            <div className="space-y-3">
              {wishDraft.map((w, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={w.name}
                    onChange={(e) =>
                      setWishDraft((prev) =>
                        prev.map((row, j) => (j === i ? { ...row, name: e.target.value } : row))
                      )
                    }
                    placeholder={`Wish ${i + 1} — gift name`}
                    maxLength={80}
                    aria-label={`Wish ${i + 1} gift name`}
                    disabled={wishBusy}
                  />
                  <Input
                    value={w.details}
                    onChange={(e) =>
                      setWishDraft((prev) =>
                        prev.map((row, j) => (j === i ? { ...row, details: e.target.value } : row))
                      )
                    }
                    placeholder="Details (opsyonal) — size, color, atbp."
                    maxLength={200}
                    aria-label={`Wish ${i + 1} details`}
                    disabled={wishBusy}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setWishRow(null)}
                  disabled={wishBusy}
                  className="min-h-11 rounded-lg"
                >
                  Kanselahin
                </Button>
                <Button
                  onClick={saveWishlist}
                  disabled={wishBusy || !wishDraft.some((w) => w.name.trim())}
                  className="min-h-11 rounded-lg bg-xmas-forest font-semibold text-xmas-cream hover:bg-xmas-pine"
                >
                  {wishBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Nagse-save…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" aria-hidden /> I-save ang Wishlist
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : wishRow?.wishlist ? (
            <WishListItems wishes={wishesFrom(wishRow.wishlist)} />
          ) : (
            <p className="text-sm text-muted-foreground">Wala pang wishlist.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* PIN reset confirm dialog */}
      <AlertDialog
        open={!!resetTarget}
        onOpenChange={(o) => {
          if (!o) {
            setResetTarget(null);
            setResetPin("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>I-reset ang PIN ni {resetTarget?.identityCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              Pumili ng bagong 6-digit PIN para sa kanya, tapos iabot mo personally ang bagong PIN.
              Ang dating PIN niya ay hindi na gagana.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-1">
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={resetPin}
              onChange={(v: string) => setResetPin(v)}
              inputMode="numeric"
              aria-label="Bagong 6-digit PIN"
              disabled={resetBusy}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-11 w-10 border-xmas-forest/40 text-lg sm:h-12 sm:w-11"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetBusy}>Kanselahin</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmResetPin();
              }}
              disabled={resetBusy || !/^\d{6}$/.test(resetPin)}
            >
              {resetBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              I-reset ang PIN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual add-participant dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o && !addBusy) setAddOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-xmas-forest" aria-hidden /> Magdagdag ng Participant
            </DialogTitle>
            <DialogDescription>
              Para sa mga kasamang hindi maka-register online (walang phone o hindi marunong). Ang
              ilalagay mo dito ang magiging sign-in nila: First name + Last name + 6-digit PIN.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-first">First Name</Label>
                <Input
                  id="add-first"
                  value={addFirst}
                  onChange={(e) => setAddFirst(e.target.value)}
                  placeholder="e.g. Juan"
                  maxLength={40}
                  autoComplete="off"
                  autoCapitalize="words"
                  disabled={addBusy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-last">Last Name</Label>
                <Input
                  id="add-last"
                  value={addLast}
                  onChange={(e) => setAddLast(e.target.value)}
                  placeholder="e.g. Dela Cruz"
                  maxLength={40}
                  autoComplete="off"
                  autoCapitalize="words"
                  disabled={addBusy}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-sex">Sex</Label>
              <Select
                value={addSex}
                onValueChange={(v) => {
                  setAddSex(v);
                  setAddWord(""); // reset word — iba ang choices kada sex
                }}
                disabled={addBusy}
              >
                <SelectTrigger id="add-sex" className="w-full" aria-label="Sex ng participant">
                  <SelectValue placeholder="Piliin ang sex…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Babae (Female)</SelectItem>
                  <SelectItem value="male">Lalaki (Male)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-color">Color</Label>
                <Select
                  value={addColor}
                  onValueChange={(v) => setAddColor(v)}
                  disabled={addBusy}
                >
                  <SelectTrigger id="add-color" className="w-full" aria-label="Color ng identity code">
                    <SelectValue placeholder="Pumili ng color…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COLORS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-word">{addSex === "female" ? "Flower" : "Animal"}</Label>
                <Select
                  value={addWord}
                  onValueChange={(v) => setAddWord(v)}
                  disabled={addBusy || !addSex}
                >
                  <SelectTrigger
                    id="add-word"
                    className="w-full"
                    aria-label="Flower o animal ng identity code"
                  >
                    <SelectValue
                      placeholder={addSex ? `Pumili ng ${addSex === "female" ? "flower" : "animal"}…` : "Pumili muna ng sex…"}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {(addSex === "female" ? FLOWERS : ANIMALS).map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>6-Digit PIN</Label>
              <p className="text-xs text-muted-foreground">
                Ituro ito sa participant — kasama ng First name at Last name niya, ito ang
                gagamitin niyang sign-in.
              </p>
              <div className="flex justify-center py-1">
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={addPin}
                  onChange={(v: string) => setAddPin(v)}
                  inputMode="numeric"
                  aria-label="6-digit PIN ng participant"
                  disabled={addBusy}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-11 w-10 border-xmas-forest/40 text-lg sm:h-12 sm:w-11"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Wishlist (opsyonal)</Label>
              <p className="text-xs text-muted-foreground">
                Kung naka-lock na ang submissions, dito mo na ilalagay ang gift wishes nila —
                kailangan ng kahit isang wish bago makatakbo ang bunutan. Kapag pre-lock pa,
                puwede nila itong i-submit mismo.
              </p>
              {addWishes.map((w, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={w.name}
                    onChange={(e) =>
                      setAddWishes((prev) =>
                        prev.map((row, j) => (j === i ? { ...row, name: e.target.value } : row))
                      )
                    }
                    placeholder={`Wish ${i + 1} — gift name`}
                    maxLength={80}
                    aria-label={`Wish ${i + 1} gift name`}
                    disabled={addBusy}
                  />
                  <Input
                    value={w.details}
                    onChange={(e) =>
                      setAddWishes((prev) =>
                        prev.map((row, j) => (j === i ? { ...row, details: e.target.value } : row))
                      )
                    }
                    placeholder="Details (opsyonal) — size, color, atbp."
                    maxLength={200}
                    aria-label={`Wish ${i + 1} details`}
                    disabled={addBusy}
                  />
                </div>
              ))}
            </div>

            <Alert className="border-xmas-gold/50 bg-xmas-gold/10 text-[#7a6414]">
              <Info className="h-4 w-4" aria-hidden />
              <AlertDescription className="text-[#7a6414]/90">
                Kapag naka-lock na ang submissions, puwede pa rin magdagdag dito (huliang pasok) —
                pero hindi na pagkatapos ng bunutan. Huwag kalimutan ang wishlist kung naka-lock
                na, para makatakbo ang randomization.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={addBusy}
                className="min-h-11 rounded-lg"
              >
                Kanselahin
              </Button>
              <Button
                onClick={submitAddParticipant}
                disabled={
                  addBusy ||
                  !addFirst.trim() ||
                  !addLast.trim() ||
                  !addSex ||
                  !addColor ||
                  !addWord ||
                  !/^\d{6}$/.test(addPin)
                }
                className="min-h-11 rounded-lg bg-xmas-forest font-semibold text-xmas-cream hover:bg-xmas-pine"
              >
                {addBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Nagse-save…
                  </>
                ) : (
                  <>
                    <Check aria-hidden /> Ilagay sa Listahan
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lock & Validation tab
// ---------------------------------------------------------------------------

function LockTab({ version, onMutate }: TabProps) {
  const { data, loading } = useAdminFetch<Overview>("/api/admin/overview", version);
  const [busy, setBusy] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  if (!data) return null;

  const { event, totals, pendingCodes } = data;

  const setLocked = async (locked: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await apiJson("/api/admin/lock", { method: "POST", body: JSON.stringify({ locked }) });
      toast.success(
        locked ? "Naka-lock na ang lahat ng submissions! 🔒" : "Na-unlock na ang submissions."
      );
      await onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
      setLockOpen(false);
      setUnlockOpen(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionTitle icon={<Lock className="h-5 w-5 text-xmas-burgundy" aria-hidden />}>
        Submission Lock
      </SectionTitle>

      <ChristmasCard className="p-4 sm:p-6">
        {!event.submissionsLocked ? (
          <div className="space-y-5">
            <div>
              <h3 className="font-heading text-lg font-bold text-xmas-forest">Pre-lock checklist</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {totals.pending} pending{" "}
                {totals.pending === 1 ? "wishlist" : "wishlists"} sa {totals.participants}{" "}
                participants.
              </p>
              {pendingCodes && pendingCodes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {pendingCodes.map((c) => (
                    <code
                      key={c}
                      className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-700"
                    >
                      {c}
                    </code>
                  ))}
                </div>
              )}
            </div>

            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                {totals.pending === 0 ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2d6a4f]" aria-hidden />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-xmas-burgundy" aria-hidden />
                )}
                <span className="text-sm">
                  All wishlists submitted?{" "}
                  <span className="text-muted-foreground">
                    ({totals.submitted}/{totals.participants})
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                {!event.registrationOpen ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2d6a4f]" aria-hidden />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-xmas-burgundy" aria-hidden />
                )}
                <span className="text-sm">
                  Registration reviewed?{" "}
                  <span className="text-muted-foreground">
                    ({event.registrationOpen ? "bukas pa — review muna" : "sarado na — okay"})
                  </span>
                </span>
              </li>
            </ul>

            <Separator />

            <p className="font-heading text-base font-bold text-xmas-burgundy sm:text-lg">
              I-lock na ba ang lahat ng submissions? Kapag naka-lock na, hindi na makakapag-edit o
              makakapag-submit ang participants.
            </p>

            <Button
              className="bg-xmas-burgundy text-white hover:bg-xmas-burgundy/90"
              disabled={busy || totals.participants === 0}
              onClick={() => setLockOpen(true)}
            >
              <Lock className="h-4 w-4" aria-hidden />
              Lock All Submissions
            </Button>
            {totals.participants === 0 && (
              <p className="text-xs text-muted-foreground">Wala pang participants sa event.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-xmas-burgundy/10 text-xmas-burgundy"
                aria-hidden
              >
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-xmas-burgundy text-white">LOCKED</Badge>
                  <p className="text-sm font-semibold text-foreground">
                    since {fmt(event.lockedAt)}
                    {event.lockedBy ? ` by ${event.lockedBy}` : ""}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hindi na makakapag-edit o makakapag-submit ang participants habang naka-lock.
                </p>
              </div>
            </div>

            {event.randomizationStatus === "not_started" ? (
              <div className="space-y-2">
                <Button variant="secondary" disabled={busy} onClick={() => setUnlockOpen(true)}>
                  <Unlock className="h-4 w-4" aria-hidden />
                  Unlock Submissions
                </Button>
                <p className="text-xs text-muted-foreground">
                  Puwede pa i-unlock dahil hindi pa tumatakbo ang randomization.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Button variant="secondary" disabled>
                  <Unlock className="h-4 w-4" aria-hidden />
                  Unlock Submissions
                </Button>
                <p className="text-xs text-muted-foreground">
                  Hindi na pwede i-unlock dahil may randomization na.
                </p>
              </div>
            )}
          </div>
        )}
      </ChristmasCard>

      {/* Lock confirm */}
      <AlertDialog open={lockOpen} onOpenChange={setLockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock All Submissions?</AlertDialogTitle>
            <AlertDialogDescription>
              I-lock na ba ang lahat ng submissions? Kapag naka-lock na, hindi na makakapag-edit o
              makakapag-submit ang participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Kanselahin</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setLocked(true);
              }}
              disabled={busy}
              className="bg-xmas-burgundy text-white hover:bg-xmas-burgundy/90"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Oo, i-lock na
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlock confirm */}
      <AlertDialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Submissions?</AlertDialogTitle>
            <AlertDialogDescription>
              Bubuksan ulit ang submissions — puwede na ulit mag-edit at mag-submit ang
              participants. Sigurado ka ba?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Kanselahin</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setLocked(false);
              }}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Oo, i-unlock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Randomization tab
// ---------------------------------------------------------------------------

function RandomizeTab({ version, onMutate }: TabProps) {
  const overview = useAdminFetch<Overview>("/api/admin/overview", version);
  const assignments = useAdminFetch<AssignmentsData>("/api/admin/assignments", version);

  const [doubleChecked, setDoubleChecked] = useState(false);
  const [running, setRunning] = useState(false);
  const [viewRow, setViewRow] = useState<AssignmentRow | null>(null);
  const [reconfirmOpen, setReconfirmOpen] = useState(false);

  if (overview.loading && !overview.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  if (!overview.data) return null;

  const { canRandomize, blockers } = overview.data;
  const asg = assignments.data;
  const hasResults = !!asg && !!asg.batchId && asg.assignments.length > 0;
  const released = !!asg && asg.released;

  const runRandomize = async () => {
    if (running) return;
    setRunning(true);
    try {
      await apiJson("/api/admin/randomize", { method: "POST" });
      toast.success("Valid assignment generated! Walang nagdrowing ng sarili. ✅");
      setDoubleChecked(false);
      await onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setRunning(false);
      setReconfirmOpen(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionTitle icon={<Shuffle className="h-5 w-5 text-xmas-gold" aria-hidden />}>
        Official Bunutan (Randomization)
      </SectionTitle>

      {!canRandomize ? (
        <div className="space-y-4">
          <Alert variant="destructive" className="border-xmas-burgundy/40">
            <TriangleAlert />
            <AlertTitle>Hindi pa pwede ang randomization:</AlertTitle>
            <AlertDescription>
              {blockers.length > 0 ? (
                <ul className="list-disc space-y-0.5 pl-4">
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : (
                <p>Ayusin muna ang mga nasa taas bago tumuloy.</p>
              )}
            </AlertDescription>
          </Alert>
          <Button disabled>
            <Shuffle className="h-4 w-4" aria-hidden />
            🎲 Start Randomization
          </Button>
        </div>
      ) : (
        <ChristmasCard className="p-4 sm:p-6">
          <div className="space-y-4">
            <Alert className="border-xmas-gold/60 bg-xmas-gold/10 text-[#7a6414] [&>svg]:text-[#7a6414]">
              <Sparkles />
              <AlertTitle>
                Ready na ba ang lahat? I-double-check muna ang participants dahil magsisimula na
                ang official bunutan.
              </AlertTitle>
            </Alert>

            <div className="flex items-center gap-3">
              <Switch
                id="confirm-dblcheck"
                checked={doubleChecked}
                onCheckedChange={setDoubleChecked}
                disabled={running}
              />
              <Label htmlFor="confirm-dblcheck" className="cursor-pointer text-sm">
                Na-double-check ko na ang participants.
              </Label>
            </div>

            <Button
              onClick={runRandomize}
              disabled={!doubleChecked || running}
              className="bg-xmas-forest text-white hover:bg-xmas-forest/90"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Shuffle className="h-4 w-4" aria-hidden />
              )}
              {running ? "Bubunot na…" : "🎲 Start Randomization"}
            </Button>
          </div>
        </ChristmasCard>
      )}

      {/* Results */}
      {hasResults && asg && (
        <ChristmasCard className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-lg font-bold text-xmas-forest">Results</h3>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                batch: {asg.batchId}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-xmas-gold/60 bg-xmas-gold/10 text-foreground"
              >
                {asg.assignments.length} assignments
              </Badge>
              <a href="/api/admin/export/assignments" download>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 border-[#2d6a4f]/40 bg-[#2d6a4f] px-3 font-semibold text-white hover:bg-[#2d6a4f]/90"
                  title="I-download ang kumpletong resulta ng bunutan bilang CSV"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  I-download ang Resulta (CSV)
                </Button>
              </a>
            </div>
          </div>

          <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Real names visible sa admin only. Walang participant na na-assign sa sarili niya
            (verified derangement).
          </p>

          <div className="nice-scroll mt-4 max-h-[55vh] overflow-auto rounded-lg border">
            <div className="min-w-[640px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
                  <TableRow>
                    <TableHead>Giver</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="text-right">Recipient Wishlist</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asg.assignments.map((row) => (
                    <TableRow key={`${row.giver.code}→${row.recipient.code}`}>
                      <TableCell>
                        <p className="font-medium">{row.giver.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{row.giver.code}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{row.recipient.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {row.recipient.code}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewRow(row)}
                          aria-label={`View wishlist ni ${row.recipient.code}`}
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {released ? (
            <Alert className="mt-4 border-[#2d6a4f]/40 bg-[#2d6a4f]/5 text-[#2d6a4f] [&>svg]:text-[#2d6a4f]">
              <Info />
              <AlertTitle>
                Released na — naka-lock na ang bunutan. (Reset lang sa Settings ang puwedeng
                magbago.)
              </AlertTitle>
            </Alert>
          ) : (
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" disabled={running} onClick={() => setReconfirmOpen(true)}>
                <Shuffle className="h-4 w-4" aria-hidden />
                Re-randomize (uli)
              </Button>
            </div>
          )}
        </ChristmasCard>
      )}

      {/* Wishlist view dialog */}
      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wishlist ni {viewRow?.recipient.code}</DialogTitle>
            <DialogDescription>
              {viewRow ? `Recipient: ${viewRow.recipient.name} (${viewRow.recipient.code})` : ""}
            </DialogDescription>
          </DialogHeader>
          {viewRow && (
            <WishListItems
              wishes={
                viewRow.wishes.length > 0
                  ? viewRow.wishes.map((w) => ({ name: w.name, details: w.details }))
                  : [{ name: null, details: null }]
              }
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Re-randomize confirm */}
      <AlertDialog open={reconfirmOpen} onOpenChange={setReconfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bagong bunutan?</AlertDialogTitle>
            <AlertDialogDescription>
              Mapapalitan ang kasalukuyang assignments. Puwede ito hangga&apos;t hindi pa released.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Kanselahin</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runRandomize();
              }}
              disabled={running}
            >
              {running && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Oo, i-randomize uli
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Release tab
// ---------------------------------------------------------------------------

function ReleaseTab({ version, onMutate }: TabProps) {
  const overview = useAdminFetch<Overview>("/api/admin/overview", version);
  const assignments = useAdminFetch<AssignmentsData>("/api/admin/assignments", version);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (overview.loading && !overview.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }
  if (!overview.data) return null;

  const event = overview.data.event;
  const count = assignments.data?.assignments.length ?? 0;
  const batchId = assignments.data?.batchId ?? null;

  const doRelease = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiJson("/api/admin/release", { method: "POST" });
      toast.success(
        "Released na ang assignments! Puwede na silang mag-sign in gamit ang pangalan at PIN nila. 🎉"
      );
      await onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  if (event.randomizationStatus === "not_started") {
    return (
      <div className="space-y-4 sm:space-y-6">
        <SectionTitle icon={<Rocket className="h-5 w-5 text-xmas-forest" aria-hidden />}>
          Release Assignments
        </SectionTitle>
        <Alert>
          <Info className="text-xmas-forest" />
          <AlertTitle>Kailangan munang tumakbo ang randomization.</AlertTitle>
          <AlertDescription>
            Puntahan muna ang Randomization tab para simulan ang official bunutan.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (event.randomizationStatus === "released") {
    return (
      <div className="space-y-4 sm:space-y-6">
        <SectionTitle icon={<Rocket className="h-5 w-5 text-xmas-forest" aria-hidden />}>
          Release Assignments
        </SectionTitle>
        <Alert className="border-[#2d6a4f]/40 bg-[#2d6a4f]/5 text-[#2d6a4f] [&>svg]:text-[#2d6a4f]">
          <BadgeCheck />
          <AlertTitle className="font-heading text-base sm:text-lg">
            RELEASED na po noong {fmt(event.releasedAt)}
            {event.releasedBy ? ` by ${event.releasedBy}` : ""}. ✅
          </AlertTitle>
          <AlertDescription className="text-[#2d6a4f]/90">
            Makikita na ng participants ang monito/monita nila pagkatapos mag-sign in gamit ang
            pangalan at 6-digit PIN nila.
          </AlertDescription>
        </Alert>
        <ChristmasCard className="p-4 sm:p-6">
          <p className="text-sm text-muted-foreground">
            Para baguhin ang bunutan: gumamit ng{" "}
            <span className="font-semibold text-foreground">Emergency Reset</span> sa Settings
            &amp; Audit tab. Ang lahat ng assignments ay mabubura at babalik sa not started.
          </p>
        </ChristmasCard>
      </div>
    );
  }

  // randomizationStatus === "completed"
  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionTitle icon={<Rocket className="h-5 w-5 text-xmas-forest" aria-hidden />}>
        Release Assignments
      </SectionTitle>

      <ChristmasCard className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-xmas-gold/15 text-xmas-gold"
              aria-hidden
            >
              <Rocket className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-xmas-forest">
                {count} assignments ready
              </h3>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                batch: {batchId ?? "—"}
              </p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Siguraduhing tama muna ang lahat sa Randomization tab bago i-release — pagkatapos
                nito, makikita na ng participants ang monito/monita nila.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={busy || count === 0}
            className="shrink-0 bg-xmas-burgundy text-white hover:bg-xmas-burgundy/90"
          >
            <Rocket className="h-4 w-4" aria-hidden />
            🚀 Release Assignments sa Participants
          </Button>
        </div>
        {count === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Wala pang assignments na naghihintay — patakbuhin muna ang randomization.
          </p>
        )}
      </ChristmasCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release assignments?</AlertDialogTitle>
            <AlertDialogDescription>
              Sigurado ka na bang i-release ang assignments? Make sure na tama ang lahat bago ito
              makita ng participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Kanselahin</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doRelease();
              }}
              disabled={busy}
              className="bg-xmas-burgundy text-white hover:bg-xmas-burgundy/90"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Oo, i-release na
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings & Audit tab
// ---------------------------------------------------------------------------

function SettingsTab({ version, onMutate }: TabProps) {
  const overview = useAdminFetch<Overview>("/api/admin/overview", version);
  const audit = useAdminFetch<AuditData>("/api/admin/audit", version);

  // --- Event settings form ---
  const [eventName, setEventName] = useState("");
  const [budgetMin, setBudgetMin] = useState("150");
  const [budgetMax, setBudgetMax] = useState("200");
  const [savingSettings, setSavingSettings] = useState(false);
  const [formSeeded, setFormSeeded] = useState(false);

  // --- Registration switch ---
  const [regOpen, setRegOpen] = useState<boolean | null>(null);
  const [pendingReg, setPendingReg] = useState<boolean | null>(null);
  const [regBusy, setRegBusy] = useState(false);

  // --- Change password ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // --- Sample data ---
  const [sampleBusy, setSampleBusy] = useState<"generate" | "delete" | null>(null);
  const [deleteSampleOpen, setDeleteSampleOpen] = useState(false);

  // --- Emergency reset ---
  const [resetText, setResetText] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  // --- Delete All Data (nuclear option) ---
  const [wipePassword, setWipePassword] = useState("");
  const [wipeBusy, setWipeBusy] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);

  useEffect(() => {
    const ev = overview.data?.event;
    if (!ev) return;
    setRegOpen(ev.registrationOpen);
    if (!formSeeded) {
      setEventName(ev.eventName);
      setBudgetMin(String(ev.budgetMin));
      setBudgetMax(String(ev.budgetMax));
      setFormSeeded(true);
    }
  }, [overview.data, formSeeded]);

  if (!overview.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64 rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const event = overview.data.event;
  const totals = overview.data.totals;
  const sampleOpsBlocked = event.submissionsLocked || event.randomizationStatus !== "not_started";
  const showEmergencyReset =
    event.randomizationStatus === "completed" || event.randomizationStatus === "released";

  /** Delete All Data: wipes participants/wishlists/assignments after a
   *  server-side admin-password re-check. Kept out of the confirm dialog so
   *  the password input is typed in the card itself (visible friction). */
  const doWipe = async () => {
    if (wipeBusy) return;
    if (!wipePassword) {
      toast.error("Pakilagay muna ang admin password.");
      return;
    }
    setWipeBusy(true);
    try {
      const res = await apiJson<{ deleted: { participants: number; wishlists: number; assignments: number } }>(
        "/api/admin/wipe",
        { method: "POST", body: JSON.stringify({ password: wipePassword }) }
      );
      setWipePassword("");
      setWipeOpen(false);
      toast.success(
        `Nabura na ang lahat — ${res.deleted.participants} participants, ${res.deleted.wishlists} wishlists, ${res.deleted.assignments} assignments.`
      );
      await onMutate();
    } catch (err) {
      setWipeOpen(false); // let the admin retype the password without closing manually
      toast.error(errMsg(err, "Hindi natuloy ang pag-bura. Pakisubok muli."));
    } finally {
      setWipeBusy(false);
    }
  };

  const saveSettings = async () => {
    if (savingSettings) return;
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (!eventName.trim()) {
      toast.error("Kailangan ng event name.");
      return;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
      toast.error("Dapat ay positive numbers ang budget min at max.");
      return;
    }
    if (min > max) {
      toast.error("Ang budget minimum ay hindi pwedeng mas mataas sa maximum.");
      return;
    }
    setSavingSettings(true);
    try {
      await apiJson("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({ eventName: eventName.trim(), budgetMin: min, budgetMax: max }),
      });
      toast.success("Na-save na ang event settings!");
      await onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const applyRegistration = async () => {
    if (pendingReg === null || regBusy) return;
    setRegBusy(true);
    try {
      await apiJson("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({ registrationOpen: pendingReg }),
      });
      toast.success(pendingReg ? "Bukas na ulit ang registration!" : "Nakasara na ang registration.");
      setRegOpen(pendingReg);
      setPendingReg(null);
      await onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setRegBusy(false);
    }
  };

  const changePassword = async () => {
    if (savingPassword) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Pakiful-fill lahat ng password fields.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Dapat hindi bababa sa 8 characters ang bagong password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Hindi tugma ang bagong password at ang confirmation.");
      return;
    }
    setSavingPassword(true);
    try {
      await apiJson("/api/admin/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSavingPassword(false);
    }
  };

  const generateSample = async () => {
    if (sampleBusy || sampleOpsBlocked) return;
    setSampleBusy("generate");
    try {
      const res = await apiJson<{ created: number }>("/api/admin/sample-data", { method: "POST" });
      toast.success(`Nagawa na ang ${res.created} sample participants (pang-test lang).`);
      await onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSampleBusy(null);
    }
  };

  const deleteSample = async () => {
    if (sampleBusy) return;
    setSampleBusy("delete");
    try {
      const res = await apiJson<{ deleted: number }>("/api/admin/sample-data", {
        method: "DELETE",
      });
      toast.success(`Nabura na ang ${res.deleted} sample participants.`);
      setDeleteSampleOpen(false);
      await onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSampleBusy(null);
    }
  };

  const doReset = async () => {
    if (resetBusy || resetText !== "RESET") return;
    setResetBusy(true);
    try {
      await apiJson("/api/admin/reset", { method: "POST" });
      toast.error("Na-reset ang bunutan.");
      setResetText("");
      await onMutate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setResetBusy(false);
    }
  };

  const logs = audit.data?.logs ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionTitle icon={<Settings2 className="h-5 w-5 text-xmas-forest" aria-hidden />}>
        Settings &amp; Audit
      </SectionTitle>

      {/* 1. Event Settings */}
      <ChristmasCard className="p-4 sm:p-6">
        <h3 className="font-heading text-lg font-bold text-xmas-forest">Event Settings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pangalan ng event at budget range na makikita ng participants.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveSettings();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Company Christmas Party 2026"
              disabled={savingSettings}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget-min">Budget Min (₱)</Label>
              <Input
                id="budget-min"
                type="number"
                min={1}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                disabled={savingSettings}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget-max">Budget Max (₱)</Label>
              <Input
                id="budget-max"
                type="number"
                min={1}
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                disabled={savingSettings}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={savingSettings}
            className="bg-xmas-forest text-white hover:bg-xmas-forest/90"
          >
            {savingSettings ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Save Settings
          </Button>
        </form>

        <Separator className="my-5" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Registration</p>
            <p className="text-xs text-muted-foreground">
              {regOpen ? "Bukas — puwede pang mag-register ang bagong participants." : "Sarado na — fixed na ang lineup."}
            </p>
          </div>
          {regOpen === null ? (
            <Skeleton className="h-6 w-11 rounded-full" />
          ) : (
            <Switch
              checked={regOpen}
              onCheckedChange={(v) => setPendingReg(v)}
              disabled={regBusy}
              aria-label="I-toggle ang registration"
            />
          )}
        </div>
      </ChristmasCard>

      {/* 2. Security */}
      <ChristmasCard className="p-4 sm:p-6">
        <h3 className="font-heading text-lg font-bold text-xmas-forest">Security</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Palitan ang admin password (min 8 characters).
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={savingPassword}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={savingPassword}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={savingPassword}
              />
            </div>
          </div>
          <Button type="submit" disabled={savingPassword} variant="outline">
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Change Password
          </Button>
        </form>
      </ChristmasCard>

      {/* 3. Sample Data (Testing) */}
      <ChristmasCard className="p-4 sm:p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-xmas-forest">
          <Database className="h-5 w-5 text-xmas-gold" aria-hidden />
          Sample Data (Testing)
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Sample data ay pang-dev/test lang — may SAMPLE badge sa Participants table. Kasalukuyang
          bilang: <span className="font-semibold text-foreground">{totals.sampleParticipants}</span>.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={generateSample}
            disabled={sampleBusy !== null || sampleOpsBlocked}
            className="bg-xmas-forest text-white hover:bg-xmas-forest/90"
          >
            {sampleBusy === "generate" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}
            Generate Sample Participants
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteSampleOpen(true)}
            disabled={sampleBusy !== null || sampleOpsBlocked || totals.sampleParticipants === 0}
            className="border-xmas-burgundy/50 text-xmas-burgundy hover:bg-xmas-burgundy/10 hover:text-xmas-burgundy"
          >
            {sampleBusy === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            Delete All Sample Data
          </Button>
        </div>
        {sampleOpsBlocked && (
          <p className="mt-2 text-xs text-muted-foreground">
            Hindi pwede mag-sample data habang naka-lock o may randomization na.
          </p>
        )}
      </ChristmasCard>

      {/* 4. Emergency Reset — only when completed/released */}
      {showEmergencyReset && (
        <ChristmasCard className="border-xmas-burgundy/40 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-xmas-burgundy/10 text-xmas-burgundy"
              aria-hidden
            >
              <TriangleAlert className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-lg font-bold text-xmas-burgundy">
                Emergency Reset
              </h3>
              <p className="mt-1 text-sm">
                EMERGENCY RESET: Buburahin ang LAHAT ng assignments at babalik sa{" "}
                <span className="font-mono text-xs">not started</span>. Ang mga participant na
                naka-check na ay mawawalan ng access. Audit record ang pag-reset na ito.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value)}
                  placeholder='I-type ang "RESET" para i-confirm'
                  className="sm:max-w-xs"
                  aria-label="I-type ang RESET para i-confirm"
                  disabled={resetBusy}
                />
                <Button
                  variant="destructive"
                  onClick={doReset}
                  disabled={resetBusy || resetText !== "RESET"}
                >
                  {resetBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Reset Assignments
                </Button>
              </div>
            </div>
          </div>
        </ChristmasCard>
      )}

      {/* 5. Delete All Data — requires admin password */}
      <ChristmasCard className="border-xmas-burgundy/40 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-xmas-burgundy/10 text-xmas-burgundy"
            aria-hidden
          >
            <Trash2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-bold text-xmas-burgundy">
              Delete All Data
            </h3>
            <p className="mt-1 text-sm">
              Buburahin ang <span className="font-semibold">LAHAT</span> ng participants, wishlists,
              at assignments — kasama ang lock at bunutan state. Hindi ito maibabalik. Ang event
              settings (name, budget) at ang Audit Log ay mananatili para sa records.
            </p>
            <p className="mt-2 text-sm font-medium text-xmas-burgundy">
              Kailangan ang admin password para tumuloy.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="password"
                autoComplete="current-password"
                value={wipePassword}
                onChange={(e) => setWipePassword(e.target.value)}
                placeholder="Admin password"
                className="sm:max-w-xs"
                aria-label="Admin password para burahin ang lahat ng data"
                disabled={wipeBusy}
              />
              <Button
                variant="destructive"
                onClick={() => setWipeOpen(true)}
                disabled={wipeBusy || !wipePassword}
              >
                {wipeBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Delete All Data
              </Button>
            </div>
          </div>
        </div>
      </ChristmasCard>

      <AlertDialog open={wipeOpen} onOpenChange={(o) => !wipeBusy && setWipeOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Burahin ang LAHAT ng data?</AlertDialogTitle>
            <AlertDialogDescription>
              Mawawalan ng access ang lahat ng participants, at mabubura ang lahat ng wishlists at
              assignments. Hindi na ito maibabalik. Ang admin password na nai-type mo ang
              kukuwentahan sa server bago tuloyan ang pag-bura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={wipeBusy}>Kanselahin</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doWipe();
              }}
              disabled={wipeBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {wipeBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Oo, burahin lahat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 6. Audit Log */}
      <ChristmasCard className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-xmas-forest">
            <History className="h-5 w-5 text-xmas-gold" aria-hidden />
            Audit Log
          </h3>
          <div className="flex items-center gap-2 no-print">
            <a href="/api/admin/export/assignments" download>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4" aria-hidden />
                Export Assignments CSV
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={() => onMutate()} disabled={audit.loading}>
              <RefreshCw className={cn("h-4 w-4", audit.loading && "animate-spin")} aria-hidden />
              Refresh
            </Button>
          </div>
        </div>

        {audit.loading && logs.length === 0 ? (
          <div className="mt-4">
            <TableSkeleton rows={5} />
          </div>
        ) : (
          <div className="nice-scroll mt-4 max-h-96 overflow-auto rounded-lg border">
            <div className="min-w-[600px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                        Wala pang audit records.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {fmtShort(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.actor}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs font-bold text-xmas-forest">
                          {log.action}
                        </TableCell>
                        <TableCell className="max-w-[320px] whitespace-normal break-words text-xs text-muted-foreground">
                          {log.details || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ChristmasCard>

      {/* Registration toggle confirm */}
      <AlertDialog open={pendingReg !== null} onOpenChange={(o) => !o && setPendingReg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingReg ? "Bubuksan ulit ang registration?" : "Isasara na ang registration?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReg
                ? "Puwede nang mag-register ulit ang bagong participants. Sigurado ka ba?"
                : "Sarado na ba ang registration? Hindi na makakaregister ang bagong participants."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regBusy}>Kanselahin</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                applyRegistration();
              }}
              disabled={regBusy}
            >
              {regBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Oo, tuloy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete sample data confirm */}
      <AlertDialog open={deleteSampleOpen} onOpenChange={setDeleteSampleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Burahin lahat ng sample data?</AlertDialogTitle>
            <AlertDialogDescription>
              Mabubura ang lahat ng {totals.sampleParticipants} sample participants at wishlists
              nila. Hindi ito maibabalik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sampleBusy !== null}>Kanselahin</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteSample();
              }}
              disabled={sampleBusy !== null}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {sampleBusy === "delete" && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              Oo, burahin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
