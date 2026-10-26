"use client";

// Root single-page app: state-based view router for the ONLY page route (/).
// All data persists server-side; sessionStorage only caches the participant's
// session token for convenience during a browsing session.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Info, LockKeyhole, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppCtx,
  AssignmentResult,
  EventStatus,
  Session,
  View,
} from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { LightGarland, Snowfall, VerseFooter } from "@/components/decor";

import WelcomeView from "@/components/views/welcome";
import RegisterView from "@/components/views/register";
import WishlistView from "@/components/views/wishlist";
import ConfirmationView from "@/components/views/confirmation";
import SubmittedView from "@/components/views/submitted";
import CheckView from "@/components/views/check";
import MyAssignmentView from "@/components/views/my-assignment";
import StatusView from "@/components/views/status";
import AdminLoginView from "@/components/admin/login";
import AdminDashboardView from "@/components/admin/dashboard";

const SESSION_KEY = "mm_session_v1";

const VIEW_TRANSITION = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

export default function App() {
  const [view, setView] = useState<View>("welcome");
  const [event, setEvent] = useState<EventStatus | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [assignment, setAssignment] = useState<AssignmentResult | null>(null);
  const [booted, setBooted] = useState(false);

  const navigate = useCallback((v: View) => {
    setView(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const refreshEvent = useCallback(async (): Promise<EventStatus | null> => {
    try {
      const data = await apiJson<EventStatus>("/api/event");
      setEvent(data);
      return data;
    } catch {
      // keep previous value; status view shows its own error handling
      return null;
    }
  }, []);

  const goAdmin = useCallback(() => navigate("admin"), [navigate]);

  const setSessionPersisted = useCallback((s: Session | null) => {
    setSession(s);
    try {
      if (s) {
        // Persist only the non-secret fields — the PIN lives in memory for the
        // current screen only and is never written to storage.
        const persistable: Session = { token: s.token, identityCode: s.identityCode };
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(persistable));
      } else {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      /* private mode — session stays in memory only */
    }
  }, []);

  // Boot: load event status and restore the session (pre-lock only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const latestEvent = await refreshEvent();
      // After the admin locks submissions, the app is a sign-in-per-visit
      // window: a refresh must NOT keep anyone signed in — the home screen
      // asks for First name, Last name, and the 6-digit PIN again. (Before
      // the lock, sessions persist for the registration → wishlist flow.)
      const locked = !!latestEvent?.submissionsLocked;
      try {
        const raw = window.sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          if (locked) {
            window.sessionStorage.removeItem(SESSION_KEY);
          } else {
            setSession(JSON.parse(raw) as Session);
          }
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshEvent, navigate, setSessionPersisted]);

  const ctx: AppCtx = {
    navigate,
    session,
    setSession: setSessionPersisted,
    event,
    refreshEvent,
    assignment,
    setAssignment,
    goAdmin,
  };

  if (!booted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-xmas-cream">
        <Loader2 className="h-8 w-8 animate-spin text-xmas-gold" />
        <p className="text-sm font-medium text-xmas-forest">Inihahanda ang Pasko… 🎄</p>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case "welcome":
        return <WelcomeView ctx={ctx} />;
      case "register":
        return <RegisterView ctx={ctx} />;
      case "wishlist":
        return <WishlistView ctx={ctx} />;
      case "confirmation":
        return <ConfirmationView ctx={ctx} />;
      case "submitted":
        return <SubmittedView ctx={ctx} />;
      case "check":
        return <CheckView ctx={ctx} />;
      case "my-assignment":
        return <MyAssignmentView ctx={ctx} />;
      case "status":
        return <StatusView ctx={ctx} />;
      case "admin-login":
        return <AdminLoginView ctx={ctx} />;
      case "admin":
        return <AdminDashboardView ctx={ctx} />;
      default:
        return <WelcomeView ctx={ctx} />;
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-xmas-cream">
      <LightGarland />
      <Snowfall />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-xmas-cream/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate("welcome")}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-xmas-gold"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-xmas-forest text-xmas-goldlight shadow">
              <Gift className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-left leading-tight">
              <span className="block font-heading text-base font-bold text-xmas-forest">
                Monito–Monita
              </span>
              <span className="block text-[11px] font-medium text-muted-foreground">
                {event?.eventName ?? "Christmas Exchange Gift"}
              </span>
            </span>
          </button>
          <nav aria-label="Main navigation" className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("welcome")}
              aria-label="Home"
              className="gap-1.5 text-xmas-forest hover:bg-accent hover:text-xmas-forest"
            >
              <Home className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Home</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("status")}
              aria-label="Status"
              className="gap-1.5 text-xmas-forest hover:bg-accent hover:text-xmas-forest"
            >
              <Info className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Status</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("admin-login")}
              aria-label="Admin login"
              className="gap-1.5 text-xmas-forest hover:bg-accent hover:text-xmas-forest"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={view} {...VIEW_TRANSITION} className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <VerseFooter eventName={event?.eventName} />
    </div>
  );
}
