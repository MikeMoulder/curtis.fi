"use client";

import { tickToWbotPrice, formatPrice, rangePosition, drift, isInRange } from "@/lib/ticks";

type Status = "inrange" | "drifting" | "outrange";

interface RangeBandProps {
  tickLower: number;
  tickUpper: number;
  spotTick: number;
  /** Drift fraction above which the position is flagged as needing attention. */
  driftWarning?: number;
}

/**
 * Where the price sits inside the position's range.
 *
 * This is deliberately not a chart. The question it answers — "is my capital
 * still earning, and how close is it to stopping?" — is positional and has one
 * value, so a plotted series would add axes and gridlines without adding an
 * answer. A labelled band reads in about a second.
 *
 * Status is carried by colour *and* an icon *and* a word, never colour alone:
 * roughly one in twelve men cannot reliably separate the amber and green.
 */
export function RangeBand({
  tickLower,
  tickUpper,
  spotTick,
  driftWarning = 0.7,
}: RangeBandProps) {
  const inRange = isInRange(spotTick, tickLower, tickUpper);
  const d = drift(spotTick, tickLower, tickUpper);
  const status: Status = !inRange ? "outrange" : d >= driftWarning ? "drifting" : "inrange";

  const lowerPrice = tickToWbotPrice(tickUpper); // inverted: higher tick = lower WBOT price
  const upperPrice = tickToWbotPrice(tickLower);
  const spotPrice = tickToWbotPrice(spotTick);

  // Position of spot along the band, 0..1. Clamped so an out-of-range marker
  // pins to the edge it escaped through rather than flying off the component.
  const pos = rangePosition(spotTick, tickLower, tickUpper);
  const pct = Math.min(97, Math.max(3, pos * 100));

  const COPY: Record<Status, { label: string; detail: string }> = {
    inrange: {
      label: "In range",
      detail: "Capital is earning fees",
    },
    drifting: {
      label: "Drifting",
      detail: "Price nearing the edge. Curtis is watching for a re-centre",
    },
    outrange: {
      label: "Out of range",
      detail: "Earning nothing until the position is re-centred",
    },
  };

  const TONE: Record<Status, { text: string; fill: string; edge: string }> = {
    inrange: {
      text: "text-[var(--color-good)]",
      fill: "var(--color-good)",
      edge: "rgb(74 222 128 / 0.35)",
    },
    drifting: {
      text: "text-[var(--color-warn)]",
      fill: "var(--color-warn)",
      edge: "rgb(251 191 36 / 0.35)",
    },
    outrange: {
      text: "text-[var(--color-bad)]",
      fill: "var(--color-bad)",
      edge: "rgb(251 113 133 / 0.35)",
    },
  };

  const tone = TONE[status];
  const copy = COPY[status];

  return (
    <div>
      {/* status — icon + word + colour, so identity never rests on hue */}
      <div className="flex items-center gap-2">
        <StatusIcon status={status} />
        <span className={`text-[13px] font-semibold ${tone.text}`}>{copy.label}</span>
        <span className="text-[12px] text-[var(--color-faint)]">· {copy.detail}</span>
      </div>

      {/* the band */}
      <div className="mt-5">
        <div className="relative h-11">
          {/* track */}
          <div className="absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
            {/* active range fill */}
            <div
              className="absolute inset-y-0 left-0 right-0 transition-colors duration-500"
              style={{
                background: `linear-gradient(90deg, ${tone.edge} 0%, ${tone.edge} 100%)`,
                opacity: status === "outrange" ? 0.18 : 0.3,
              }}
            />
            {/* concentration hint: fees accrue fastest nearest spot */}
            <div
              className="absolute inset-y-0 w-[38%] transition-all duration-700"
              style={{
                left: `${pct}%`,
                transform: "translateX(-50%)",
                background: `radial-gradient(ellipse at center, ${tone.fill}55 0%, transparent 72%)`,
              }}
            />
          </div>

          {/* spot marker */}
          <div
            className="absolute top-0 bottom-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ left: `${pct}%` }}
          >
            <div
              className="h-full w-0.5 -translate-x-1/2 rounded-full"
              style={{
                background: tone.fill,
                boxShadow: `0 0 12px 2px ${tone.fill}88`,
              }}
            />
          </div>
        </div>

        {/* bounds, direct-labelled — no axis needed for two values */}
        <div className="mt-2.5 flex items-start justify-between">
          <Bound label="Lower" price={lowerPrice} align="left" />
          <div className="text-center">
            <div className="text-[10.5px] tracking-wider text-[var(--color-faint)] uppercase">
              Spot
            </div>
            <div className={`tabular mt-0.5 text-[14px] font-semibold ${tone.text}`}>
              ${formatPrice(spotPrice)}
            </div>
          </div>
          <Bound label="Upper" price={upperPrice} align="right" />
        </div>
      </div>
    </div>
  );
}

function Bound({
  label,
  price,
  align,
}: {
  label: string;
  price: number;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-[10.5px] tracking-wider text-[var(--color-faint)] uppercase">
        {label}
      </div>
      <div className="tabular mt-0.5 text-[13px] text-[var(--color-mid)]">
        ${formatPrice(price)}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "inrange") {
    return (
      <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="var(--color-good)" strokeOpacity="0.45" />
        <path
          d="M5 8.2 7 10.2l4-4.4"
          stroke="var(--color-good)"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "drifting") {
    return (
      <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="var(--color-warn)" strokeOpacity="0.45" />
        <path
          d="M8 4.6v4.2"
          stroke="var(--color-warn)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <circle cx="8" cy="11.3" r="0.9" fill="var(--color-warn)" />
      </svg>
    );
  }
  return (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="var(--color-bad)" strokeOpacity="0.45" />
      <path
        d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8"
        stroke="var(--color-bad)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
