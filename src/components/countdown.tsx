"use client";

// Friendly countdown chips: registration closing, wishlist lock, and the fellowship day.
import { useEffect, useState } from "react";
import { CalendarClock, Lock, PartyPopper } from "lucide-react";
import { EventStatus } from "@/lib/app-context";
import { FELLOWSHIP_DATE } from "@/lib/event-config";

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

function remaining(target: number, now: number): string | null {
  const ms = target - now;
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d >= 2) return `${d} araw`;
  if (d >= 1) return `${d} araw ${h} oras`;
  if (h >= 1) return `${h} oras ${m} min`;
  return `${Math.max(m, 1)} min`;
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-xmas-gold/50 bg-xmas-gold/10 px-3 py-1.5 text-xs font-semibold text-xmas-forest">
      {icon}
      {children}
    </span>
  );
}

export function EventCountdowns({ event }: { event: EventStatus | null }) {
  const now = useNow();
  if (now === null) return null;
  const chips: React.ReactNode[] = [];

  if (event?.registrationOpen && event.registrationClosesAt) {
    const r = remaining(new Date(event.registrationClosesAt).getTime(), now);
    if (r) chips.push(<Chip key="reg" icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />}>Magsasara ang registration sa {r}</Chip>);
  }
  if (event && !event.submissionsLocked && event.submissionsLockAt) {
    const r = remaining(new Date(event.submissionsLockAt).getTime(), now);
    if (r) chips.push(<Chip key="lock" icon={<Lock className="h-3.5 w-3.5" aria-hidden />}>Ila-lock ang wishlist sa {r}</Chip>);
  }
  const fellowship = new Date(`${FELLOWSHIP_DATE} 00:00`).getTime();
  if (!Number.isNaN(fellowship)) {
    const days = Math.ceil((fellowship - now) / 86_400_000);
    if (days > 1) chips.push(<Chip key="fel" icon={<PartyPopper className="h-3.5 w-3.5" aria-hidden />}>{days} araw na lang bago ang Fellowship!</Chip>);
    else if (days === 1) chips.push(<Chip key="fel" icon={<PartyPopper className="h-3.5 w-3.5" aria-hidden />}>Bukas na ang Fellowship! 🎉</Chip>);
    else if (days === 0) chips.push(<Chip key="fel" icon={<PartyPopper className="h-3.5 w-3.5" aria-hidden />}>Ngayon na ang Fellowship! 🎉</Chip>);
  }
  if (chips.length === 0) return null;
  return <div className="flex flex-wrap items-center justify-center gap-2">{chips}</div>;
}
