"use client";

import { drift, isInRange } from "@/lib/ticks";
import { ToleranceGauge } from "@/components/viz/ToleranceGauge";

export type RangeStatus = "inrange" | "drifting" | "outrange";

interface RangeBandProps {
  tickLower: number;
  tickUpper: number;
  spotTick: number;
  /** Drift fraction above which the position is flagged as needing attention. */
  driftWarning?: number;
  /** Surface this is drawn on, for the gauge's knockout figures. */
  ground?: string;
}

/**
 * Where the price sits inside the position you hold.
 *
 * The drawing is the tolerance gauge in measured mode — the same instrument the
 * hero uses, so a reader who understood the front page is not taught a second
 * notation. What stays here is the part a gauge cannot say: whether this is
 * fine, carried by an icon and a word as well as a hue, because roughly one man
 * in twelve cannot reliably separate the amber from the green.
 *
 * Everything else that used to sit under it — headroom, plus two sentences
 * explaining what headroom means — moved into the page's status strip, where it
 * is one figure among four rather than a paragraph.
 */
export function RangeBand({
  tickLower,
  tickUpper,
  spotTick,
  driftWarning = 0.7,
  ground = "var(--color-film-2)",
}: RangeBandProps) {
  const status = rangeStatus(spotTick, tickLower, tickUpper, driftWarning);

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-[var(--hair)] pb-3.5">
        <StatusIcon status={status} />
        <span className={`head text-[15px] ${TONE[status].text}`}>{RANGE_LABEL[status]}</span>
      </div>

      <ToleranceGauge
        className="mt-1"
        spotTick={spotTick}
        tickLower={tickLower}
        tickUpper={tickUpper}
        tone={status === "outrange" ? "escaped" : "normal"}
        ground={ground}
      />
    </div>
  );
}

export function rangeStatus(
  spotTick: number,
  tickLower: number,
  tickUpper: number,
  driftWarning = 0.7
): RangeStatus {
  if (!isInRange(spotTick, tickLower, tickUpper)) return "outrange";
  return drift(spotTick, tickLower, tickUpper) >= driftWarning ? "drifting" : "inrange";
}

export const RANGE_LABEL: Record<RangeStatus, string> = {
  inrange: "In range",
  drifting: "Drifting",
  outrange: "Out of range",
};

/* Arc convention, and the same three inks the rest of the sheet uses for
   normal / caution / stopped. */
export const TONE: Record<RangeStatus, { text: string; ink: string }> = {
  inrange: { text: "text-[var(--color-arc-green)]", ink: "var(--color-arc-green)" },
  drifting: { text: "text-[var(--color-arc-amber)]", ink: "var(--color-arc-amber)" },
  outrange: { text: "text-[var(--color-oxide)]", ink: "var(--color-oxide)" },
};

export function StatusIcon({ status }: { status: RangeStatus }) {
  const ink = TONE[status].ink;
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" stroke={ink} strokeOpacity="0.5" />
      {status === "inrange" && (
        <path
          d="M4.6 8.2 6.8 10.4l4.6-5"
          stroke={ink}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {status === "drifting" && (
        <>
          <path d="M8 4.4v4.4" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="11.4" r="0.95" fill={ink} />
        </>
      )}
      {status === "outrange" && (
        <path
          d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2"
          stroke={ink}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
