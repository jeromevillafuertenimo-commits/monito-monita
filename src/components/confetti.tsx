"use client";

// Lightweight CSS confetti burst (no library). Skipped when the device prefers reduced motion.
import { useEffect, useMemo, useState } from "react";

const COLORS = ["#c9a227", "#1b4332", "#9b2335", "#e9c46a", "#2d6a4f", "#e76f51"];

export function Confetti({ pieces = 60, durationMs = 4500 }: { pieces?: number; durationMs?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs]);

  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: (i * 53) % 100,
        delay: ((i * 7) % 20) / 10,
        duration: 2.4 + ((i * 11) % 15) / 10,
        size: 6 + ((i * 5) % 7),
        color: COLORS[i % COLORS.length],
        drift: ((i % 7) - 3) * 30,
        round: i % 3 === 0,
      })),
    [pieces]
  );
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden no-print" aria-hidden>
      {items.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? "50%" : 2,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--confetti-drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
