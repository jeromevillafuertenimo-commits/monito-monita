"use client";

// Shared Christmas decoration + layout components (no Santa imagery —
// Christ-centered, wholesome visuals only).
import { useMemo } from "react";
import { CalendarDays, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { FELLOWSHIP_DATE } from "@/lib/event-config";

/** Twinkling Christmas-light garland pinned to the top of the viewport. */
export function LightGarland() {
  const bulbs = useMemo(() => {
    const colors = ["#2d6a4f", "#c9a227", "#b23a48", "#7a1e2b", "#e9c46a"];
    return Array.from({ length: 26 }, (_, i) => ({
      color: colors[i % colors.length],
      delay: (i % 7) * 0.35,
      left: (i / 25) * 100,
    }));
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 no-print" aria-hidden>
      <div className="relative h-[6px] w-full bg-gradient-to-b from-xmas-forest to-xmas-forest/60 shadow-sm" />
      <div className="relative mx-auto flex max-w-6xl justify-between px-4">
        {bulbs.map((b, i) => (
          <span key={i} className="relative flex flex-col items-center" style={{ marginTop: -2 }}>
            <span className="block h-2 w-[3px] bg-xmas-forest/70" />
            <span
              className="bulb block h-2.5 w-2.5 rounded-full shadow-[0_0_8px_2px_rgba(233,196,106,0.35)]"
              style={{ backgroundColor: b.color, animationDelay: `${b.delay}s` }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Gentle snowfall layer (pure CSS, pointer-events disabled). */
export function Snowfall({ count = 16 }: { count?: number }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 97) % 100,
        size: 8 + ((i * 13) % 12),
        duration: 9 + ((i * 7) % 10),
        delay: -((i * 3) % 12),
        drift: ((i % 5) - 2) * 22,
        opacity: 0.35 + ((i % 4) * 0.12),
        char: i % 3 === 0 ? "❅" : i % 3 === 1 ? "❆" : "❄",
      })),
    [count]
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden no-print" aria-hidden>
      {flakes.map((f, i) => (
        <span
          key={i}
          className="snowflake"
          style={{
            left: `${f.left}%`,
            fontSize: f.size,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            ["--flake-drift" as string]: `${f.drift}px`,
            ["--flake-opacity" as string]: f.opacity,
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
}

/** Section heading with gold stars. */
export function SectionTitle({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon ?? <Star className="h-5 w-5 fill-xmas-gold text-xmas-gold" aria-hidden />}
      <h2 className="font-heading text-2xl font-bold text-xmas-forest sm:text-3xl">{children}</h2>
    </div>
  );
}

/** Warm card wrapper with gold top border. */
export function ChristmasCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-xmas-gold before:via-xmas-goldlight before:to-xmas-gold",
        className
      )}
    >
      {children}
    </div>
  );
}

/** "Christmas Fellowship: December 20, 2026" pill — the gift-giving day. */
export function FellowshipDateBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-xmas-pine/40 bg-xmas-pine/10 px-4 py-1.5 text-sm font-semibold text-xmas-pine",
        className
      )}
    >
      <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        Christmas Fellowship: <span className="font-bold">{FELLOWSHIP_DATE}</span>
      </span>
    </span>
  );
}

/** ₱150–₱200 budget pill. */
export function BudgetBadge({ min, max, className }: { min: number; max: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-xmas-gold/60 bg-xmas-gold/15 px-3 py-1 text-sm font-bold text-[#7a6414]",
        className
      )}
    >
      🎁 Budget: ₱{min}–₱{max}
    </span>
  );
}

/** Footer verse — tasteful, Christ-centered. */
export function VerseFooter({ eventName }: { eventName?: string }) {
  return (
    <footer className="mt-auto border-t border-border/70 bg-gradient-to-b from-transparent to-xmas-creamdark/80">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1.5 px-4 py-6 text-center">
        <Star className="h-4 w-4 fill-xmas-gold text-xmas-gold" aria-hidden />
        <p className="font-heading text-sm italic text-xmas-forest/80">
          &ldquo;For unto us a Child is born, unto us a Son is given.&rdquo; — Isaiah 9:6
        </p>
        <p className="text-xs text-muted-foreground">
          {eventName ? `${eventName} • ` : ""}Christmas Fellowship: {FELLOWSHIP_DATE}
        </p>
        <p className="text-xs text-muted-foreground">
          Maligayang Pasko! 🎄 All records are saved securely on the server.
        </p>
      </div>
    </footer>
  );
}
