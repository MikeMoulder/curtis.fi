"use client";

import { useEffect, useState } from "react";
import { Curtis, type CurtisState } from "./Curtis";

const CYCLE: { state: CurtisState; ms: number }[] = [
  { state: "idle", ms: 3400 },
  { state: "scanning", ms: 3600 },
  { state: "thinking", ms: 3100 },
  { state: "acting", ms: 2200 },
  { state: "success", ms: 3000 },
];

/**
 * Curtis in the hero, walking his real loop.
 *
 * No captions here — the states carry themselves, and a block of changing text
 * beside the headline competes with it. The narrated version lives further down
 * the page where explanation is the job.
 */
export function HeroCurtis({ size = 250 }: { size?: number }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setI((n) => (n + 1) % CYCLE.length), CYCLE[i].ms);
    return () => window.clearTimeout(t);
  }, [i]);

  return <Curtis state={CYCLE[i].state} size={size} />;
}
