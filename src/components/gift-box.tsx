"use client";

// Interactive gift box: click (or Enter/Space) triggers a ribbon-unwrap +
// lid-pop animation before calling onOpen. Includes a Skip option and
// respects prefers-reduced-motion. Accessible via role="button".
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface GiftBoxProps {
  onOpen: () => void;
  size?: number;
  label?: string;
  className?: string;
}

const SPARKS = [
  { x: -70, y: -95, d: 0 },
  { x: 60, y: -110, d: 0.08 },
  { x: -95, y: -20, d: 0.16 },
  { x: 95, y: -30, d: 0.05 },
  { x: -40, y: -130, d: 0.12 },
  { x: 30, y: -70, d: 0.2 },
];

export function GiftBox({ onOpen, size = 170, label, className }: GiftBoxProps) {
  const [opening, setOpening] = useState(false);
  const controlsRef = useRef<{ done?: boolean }>({});
  const reduceMotion = useReducedMotion();

  const open = useCallback(() => {
    if (opening) return;
    if (reduceMotion) {
      onOpen();
      return;
    }
    setOpening(true);
    // Total choreography ~ 1.1s, then transition to the next screen.
    window.setTimeout(() => {
      controlsRef.current.done = true;
      onOpen();
    }, 1100);
  }, [opening, onOpen, reduceMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !opening) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, opening]);

  const w = size;
  const lidW = w * 1.16;
  const bodyH = w * 0.72;
  const lidH = w * 0.24;

  return (
    <div className={`flex flex-col items-center gap-4 ${className ?? ""}`}>
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={label ?? "Buksan ang gift box"}
        onClick={open}
        className="relative cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-xmas-gold/60 rounded-2xl"
        style={{ width: lidW + 40, height: w + 30 }}
        whileHover={!opening ? { scale: 1.05 } : undefined}
        whileTap={!opening ? { scale: 0.96 } : undefined}
      >
        {/* Sparkle burst */}
        {opening &&
          SPARKS.map((s, i) => (
            <span
              key={i}
              className="sparkle absolute text-xmas-gold"
              style={{ left: "50%", top: "35%", marginLeft: s.x, marginTop: s.y, animationDelay: `${s.d}s` }}
            >
              <Sparkles size={22} aria-hidden />
            </span>
          ))}

        {/* Lid */}
        <motion.div
          className="absolute left-1/2 z-20"
          style={{ top: 0, width: lidW, height: lidH, x: "-50%", transformOrigin: "50% 100%" }}
          animate={
            opening
              ? { y: -w * 0.55, rotate: -16, opacity: 0, transition: { duration: 0.55, ease: "easeIn" } }
              : { y: [-2, -6, -2], rotate: [0, -1.2, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }
          }
        >
          {/* Lid box */}
          <div
            className="absolute inset-0 rounded-lg bg-gradient-to-b from-xmas-red to-xmas-burgundy shadow-md"
            style={{ borderRadius: 10 }}
          />
          {/* Lid vertical ribbon */}
          <div
            className="absolute bg-xmas-gold"
            style={{ left: "50%", transform: "translateX(-50%)", top: 0, bottom: 0, width: w * 0.16 }}
          />
          {/* Bow */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              className="flex items-end"
              animate={opening ? { scale: 1.6, opacity: 0, y: -30, transition: { duration: 0.4 } } : {}}
            >
              <span className="block h-5 w-7 -mr-1 rounded-full border-4 border-xmas-gold bg-xmas-goldlight" style={{ borderRadius: "50% 50% 0 50%" }} />
              <span className="block h-4 w-3 rounded-full bg-xmas-gold" />
              <span className="block h-5 w-7 -ml-1 rounded-full border-4 border-xmas-gold bg-xmas-goldlight" style={{ borderRadius: "50% 50% 50% 0" }} />
            </motion.div>
          </div>
        </motion.div>

        {/* Box body */}
        <motion.div
          className="absolute left-1/2 z-10 overflow-hidden shadow-lg"
          style={{ top: lidH, width: w, height: bodyH, x: "-50%", borderRadius: 10 }}
          animate={
            opening
              ? { scale: [1, 1.04, 1], transition: { duration: 0.5 } }
              : { y: [0, -3, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 } }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-b from-xmas-red via-[#a63240] to-xmas-burgundy" />
          {/* Vertical ribbon */}
          <div
            className="absolute bg-gradient-to-b from-xmas-goldlight to-xmas-gold"
            style={{ left: "50%", transform: "translateX(-50%)", top: 0, bottom: 0, width: w * 0.16 }}
          />
          {/* Horizontal ribbon */}
          <div
            className="absolute bg-gradient-to-r from-xmas-goldlight to-xmas-gold"
            style={{ left: 0, right: 0, top: "38%", height: w * 0.1 }}
          />
          {/* Subtle pattern dots */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#fdf8ec 1.2px, transparent 1.2px)", backgroundSize: "18px 18px" }} />
          {/* Light beam from inside when opening */}
          {opening && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0.4] }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{ background: "radial-gradient(circle at 50% 0%, #ffe9a8 0%, transparent 60%)" }}
            />
          )}
        </motion.div>

        {/* Ground shadow */}
        <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/10 blur-md" style={{ bottom: -8, width: w * 1.05, height: 14 }} />
      </motion.div>

      {label && !opening && (
        <p className="text-sm font-semibold text-xmas-pine animate-pulse">{label}</p>
      )}

      {!opening && (
        <button
          type="button"
          onClick={open}
          className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-xmas-pine transition-colors"
        >
          Skip animation
        </button>
      )}
    </div>
  );
}
