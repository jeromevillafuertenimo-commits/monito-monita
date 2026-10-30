"use client";

// Display preferences saved on this device: snow on/off and text size.
import { useCallback, useEffect, useState } from "react";
import { lsGet, lsSet } from "@/lib/local-store";

export const TEXT_SCALES = [100, 112, 125] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export function useDisplayPrefs() {
  const [snow, setSnowState] = useState(true);
  const [textScale, setTextScaleState] = useState<TextScale>(100);

  useEffect(() => {
    if (lsGet("mm-snow") === "off") setSnowState(false);
    const t = Number(lsGet("mm-text-scale"));
    if ((TEXT_SCALES as readonly number[]).includes(t)) setTextScaleState(t as TextScale);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${textScale}%`;
  }, [textScale]);

  const toggleSnow = useCallback(() => {
    setSnowState((prev) => {
      lsSet("mm-snow", prev ? "off" : "on");
      return !prev;
    });
  }, []);

  const cycleTextScale = useCallback(() => {
    setTextScaleState((prev) => {
      const next = TEXT_SCALES[(TEXT_SCALES.indexOf(prev) + 1) % TEXT_SCALES.length];
      lsSet("mm-text-scale", String(next));
      return next;
    });
  }, []);

  return { snow, toggleSnow, textScale, cycleTextScale };
}
