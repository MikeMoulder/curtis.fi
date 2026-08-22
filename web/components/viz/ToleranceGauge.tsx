"use client";

import { useId } from "react";
import { pctToTicks, ticksToPct, tickToWbotPrice } from "@/lib/ticks";

/**
 * THE TOLERANCE GAUGE — the signature element.
 *
 * A V3 tick range is a tolerance band around a nominal dimension, so it is
 * drawn the way a drawing draws one: a graduated scale, the band bracketed with
 * arrow terminators over the region it covers, extension lines dropped to the
 * scale, and a datum flag standing at the measured value.
 *
 * Every mark carries a number. The graduation is the pool's real tick spacing
 * (60), the band is a real width in ticks, and the datum sits at the live spot
 * price. Nothing here is ornament that could be deleted without losing
 * information — which is the test the rest of the page is held to as well.
 *
 * Drafting conventions observed deliberately, because getting them wrong is
 * what makes technical pastiche look like pastiche:
 *   - extension lines stop short of the object they measure, leaving a gap
 *   - dimension lines terminate in filled arrowheads, not strokes
 *   - the section fill is hatched at 45°, and denser hatching means more
 *     concentrated capital
 *   - figures sit centred beneath their own tick, never floating
 */

const W = 1000;
const H = 250;
const PAD = 54;

/** Scale baseline. Graduation hangs below it, the band sits above. */
const Y_SCALE = 186;
const Y_BAND_TOP = 74;
const Y_BAND_BOT = 160;
const Y_DIM = 40;

const SPACING = 60; // the pool's real tick spacing
const TARGET_DIVISIONS = 26; // graduation density the scale aims for, whatever the span

interface Props {
  /** Live pool tick. */
  spotTick: number;
  /**
   * SYNTHETIC MODE — half-width of the band as a percentage of price, centred
   * on spot. Used by the hero, which is drawing the idea of a band rather than
   * anyone's actual position.
   */
  halfWidthPct?: number;
  /**
   * How far the drawn band sits from centre, 0..1 of its own half-width.
   * Synthetic mode only. The hero uses a small offset because a perfectly
   * centred needle looks staged.
   */
  driftFraction?: number;
  /**
   * MEASURED MODE — the position's real tick bounds, straight from
   * `positionInfo()`. Takes precedence over the synthetic props, and is what
   * the dashboard passes: the drawing then shows where price actually sits
   * relative to the range you actually hold, including outside it.
   */
  tickLower?: number;
  tickUpper?: number;
  /**
   * `escaped` greys the band's ink. A range price has left is no longer
   * earning, and drawing it in full-weight prussian would say otherwise.
   */
  tone?: "normal" | "escaped";
  /**
   * The surface the gauge is drawn on. Two figures knock the ground out behind
   * themselves — the way a drawing breaks a line for its own dimension — so the
   * gauge has to be told what colour to break to. Defaults to the bare sheet;
   * pass the plate's fill when it sits inside one.
   */
  ground?: string;
  /** Runs the ink-in sequence once on mount. */
  animate?: boolean;
  className?: string;
}

export function ToleranceGauge({
  spotTick,
  halfWidthPct,
  driftFraction = 0,
  tickLower,
  tickUpper,
  tone = "normal",
  ground = "var(--color-film)",
  animate = true,
  className = "",
}: Props) {
  const measured = tickLower !== undefined && tickUpper !== undefined;

  // In measured mode the bounds are given and the width is read back off them.
  // In synthetic mode the width is given and the bounds are derived, rounded to
  // whole tick spacings exactly as the guard does.
  const halfTicks = measured
    ? (tickUpper! - tickLower!) / 2
    : Math.round(pctToTicks((halfWidthPct ?? 4.5) / 100) / SPACING) * SPACING;

  const centre = measured
    ? (tickLower! + tickUpper!) / 2
    : spotTick - Math.round((driftFraction * halfTicks) / SPACING) * SPACING;

  const lower = measured ? tickLower! : centre - halfTicks;
  const upper = measured ? tickUpper! : centre + halfTicks;

  // The callout figure is always derived from the drawn geometry, never from
  // the requested percentage — otherwise the number and the picture disagree
  // the moment rounding bites.
  const shownHalfPct = ticksToPct(halfTicks) * 100;

  // View window: normally the band occupies roughly 40% of the sheet, so it
  // reads as a narrow slice of everywhere price could be — the actual point of
  // concentrating liquidity. But a position price has escaped must still show
  // both the band and the datum, so the window opens up far enough to contain
  // whichever is further away.
  const reach = Math.max(Math.abs(upper - spotTick), Math.abs(lower - spotTick)) * 1.35;
  const viewHalf = Math.max(halfTicks * 2.5, reach);

  // The axis is flipped deliberately. In this pool a higher tick means a LOWER
  // WBOT price, so plotting ticks left-to-right would run price downward across
  // the page — backwards from every price chart a reader has ever seen. Mapping
  // price ascending instead costs one minus sign and removes the trap.
  const x = (t: number) => W / 2 - ((t - spotTick) / viewHalf) * (W / 2 - PAD);

  // Which means the upper tick lands on the left, holding the lowest price.
  const xBandLeft = x(upper);
  const xBandRight = x(lower);
  const xSpot = x(spotTick);

  // Graduation, aligned to real multiples of the tick spacing. The step is
  // chosen so the scale carries roughly the same number of divisions whatever
  // it spans: at a fixed 60 ticks a ±6% band would draw 250 of them, which is
  // a grey smear rather than a scale.
  const step =
    Math.max(1, Math.round(((viewHalf * 2) / TARGET_DIVISIONS) / SPACING)) * SPACING;
  const firstDiv = Math.ceil((spotTick - viewHalf) / step) * step;
  const lastDiv = Math.floor((spotTick + viewHalf) / step) * step;
  const divisions: { t: number; major: boolean }[] = [];
  for (let t = firstDiv; t <= lastDiv; t += step) {
    divisions.push({ t, major: Math.round(t / step) % 5 === 0 });
  }

  // A range price has left earns nothing, so its ink drops to the ghost weight
  // the sheet uses for things that are drawn but not active. Carried as a
  // custom property because the hatch patterns need it too, and a pattern
  // cannot read a prop.
  const bandInk = tone === "escaped" ? "var(--color-ink-4)" : "var(--color-prussian)";

  // The gauge now renders on two pages, and one of its defs is a geometry-bound
  // mask. Two instances sharing an id would mean one of them masked by the
  // other's band — so the ids are per-instance.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ID = {
    hatch: `tg-hatch-${uid}`,
    dense: `tg-hatch-dense-${uid}`,
    conc: `tg-conc-${uid}`,
    mask: `tg-conc-mask-${uid}`,
  };

  const priceAt = (t: number) => tickToWbotPrice(t);
  const fmt = (p: number) => p.toFixed(4);

  // Higher tick = lower WBOT price, so the readable limits invert.
  const limitLow = priceAt(upper);
  const limitHigh = priceAt(lower);

  const anim = (delay: number) =>
    animate
      ? { style: { animation: `fade-in 0.5s var(--ease-draw) ${delay}ms both` } }
      : {};

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{
          ["--band-ink" as string]: bandInk,
          ["--gauge-ground" as string]: ground,
        }}
        role="img"
        aria-label={`Tolerance gauge. Nominal price ${fmt(
          priceAt(spotTick)
        )} USDT per WBOT at tick ${spotTick}. Band spans ${fmt(limitLow)} to ${fmt(
          limitHigh
        )}, plus or minus ${shownHalfPct.toFixed(2)} percent, ${halfTicks * 2} ticks wide.${
          tone === "escaped" ? " Price is outside the band." : ""
        }`}
      >
        <defs>
          {/* Section fill. 45°, the drafting standard. Weighted to read as
              drawn line work rather than a flat tint at page scale. */}
          <pattern
            id={ID.hatch}
            width="6"
            height="6"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--band-ink)" strokeWidth="1" strokeOpacity="0.5" />
          </pattern>
          {/* Denser toward the datum: fee accrual concentrates where price sits. */}
          <pattern
            id={ID.dense}
            width="3"
            height="3"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="3" stroke="var(--band-ink)" strokeWidth="1" strokeOpacity="0.62" />
          </pattern>
          <linearGradient id={ID.conc} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={ID.mask}>
            <rect
              x={xBandLeft}
              y={Y_BAND_TOP}
              width={xBandRight - xBandLeft}
              height={Y_BAND_BOT - Y_BAND_TOP}
              fill={`url(#${ID.conc})`}
            />
          </mask>
        </defs>

        {/* ── the band ───────────────────────────────────────────────────── */}
        <g {...anim(animate ? 420 : 0)}>
          <rect
            x={xBandLeft}
            y={Y_BAND_TOP}
            width={xBandRight - xBandLeft}
            height={Y_BAND_BOT - Y_BAND_TOP}
            fill={`url(#${ID.hatch})`}
          />
          {/* Concentration: hatching thickens toward the datum. */}
          <rect
            x={xBandLeft}
            y={Y_BAND_TOP}
            width={xBandRight - xBandLeft}
            height={Y_BAND_BOT - Y_BAND_TOP}
            fill={`url(#${ID.dense})`}
            mask={`url(#${ID.mask})`}
          />
          {/* Object lines: the limits themselves, drawn heavy. */}
          <line
            x1={xBandLeft}
            y1={Y_BAND_TOP}
            x2={xBandLeft}
            y2={Y_BAND_BOT}
            stroke="var(--band-ink)"
            strokeWidth="1.6"
          />
          <line
            x1={xBandRight}
            y1={Y_BAND_TOP}
            x2={xBandRight}
            y2={Y_BAND_BOT}
            stroke="var(--band-ink)"
            strokeWidth="1.6"
          />
          <line
            x1={xBandLeft}
            y1={Y_BAND_TOP}
            x2={xBandRight}
            y2={Y_BAND_TOP}
            stroke="var(--band-ink)"
            strokeWidth="0.9"
            strokeOpacity="0.55"
          />
        </g>

        {/* ── dimension line with the tolerance callout ──────────────────── */}
        <g {...anim(animate ? 760 : 0)}>
          {/* Extension lines: gapped from the object, per convention. */}
          <line
            x1={xBandLeft}
            y1={Y_BAND_TOP - 7}
            x2={xBandLeft}
            y2={Y_DIM}
            stroke="var(--hair-2)"
            strokeWidth="0.8"
          />
          <line
            x1={xBandRight}
            y1={Y_BAND_TOP - 7}
            x2={xBandRight}
            y2={Y_DIM}
            stroke="var(--hair-2)"
            strokeWidth="0.8"
          />
          <line
            x1={xBandLeft}
            y1={Y_DIM}
            x2={xBandRight}
            y2={Y_DIM}
            stroke="var(--color-ink-3)"
            strokeWidth="0.9"
          />
          <Arrow x={xBandLeft} y={Y_DIM} dir={1} />
          <Arrow x={xBandRight} y={Y_DIM} dir={-1} />

          {/* The callout sits on the dimension line, film knocked out behind
              it — how a drawing breaks a line for its own figure. */}
          <rect
            x={(xBandLeft + xBandRight) / 2 - 62}
            y={Y_DIM - 11}
            width="124"
            height="22"
            fill="var(--gauge-ground)"
          />
          <text
            x={(xBandLeft + xBandRight) / 2}
            y={Y_DIM + 4}
            textAnchor="middle"
            className="meter"
            fontSize="14"
            fill="var(--color-ink)"
          >
            ±{shownHalfPct.toFixed(2)}%
          </text>
          <text
            x={(xBandLeft + xBandRight) / 2}
            y={Y_DIM + 26}
            textAnchor="middle"
            className="label"
            fontSize="8.5"
            fill="var(--color-ink-4)"
          >
            {halfTicks * 2} TICKS
          </text>
        </g>

        {/* ── graduated scale ────────────────────────────────────────────── */}
        <g>
          <line
            x1={PAD - 18}
            y1={Y_SCALE}
            x2={W - PAD + 18}
            y2={Y_SCALE}
            stroke="var(--color-ink)"
            strokeWidth="1.2"
            {...anim(animate ? 120 : 0)}
          />
          {divisions.map(({ t, major }, i) => {
            const px = x(t);
            if (px < PAD - 20 || px > W - PAD + 20) return null;
            return (
              <g
                key={t}
                style={
                  animate
                    ? {
                        animation: `fade-in 0.4s linear ${
                          160 + i * 11
                        }ms both`,
                      }
                    : undefined
                }
              >
                <line
                  x1={px}
                  y1={Y_SCALE}
                  x2={px}
                  y2={Y_SCALE + (major ? 13 : 6)}
                  stroke={major ? "var(--color-ink-2)" : "var(--color-ink-4)"}
                  strokeWidth={major ? 1.2 : 0.8}
                />
                {major && (
                  <text
                    x={px}
                    y={Y_SCALE + 30}
                    textAnchor="middle"
                    className="meter"
                    fontSize="10"
                    fill="var(--color-ink-3)"
                  >
                    {fmt(priceAt(t))}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* ── limit labels, tied to the scale by their own extension lines ── */}
        <g {...anim(animate ? 900 : 0)}>
          <LimitTag x={xBandLeft} label="LOWER LIMIT" value={fmt(limitLow)} align="start" />
          <LimitTag x={xBandRight} label="UPPER LIMIT" value={fmt(limitHigh)} align="end" />
        </g>

        {/* ── the datum ──────────────────────────────────────────────────────
             The one oxide mark on the drawing. It is the live measurement, so
             it gets the only colour that means "now". */}
        <g
          style={
            animate
              ? { animation: `datum-arrive 0.9s var(--ease-settle) 1040ms both` }
              : undefined
          }
        >
          <line
            x1={xSpot}
            y1={Y_BAND_TOP - 20}
            x2={xSpot}
            y2={Y_SCALE + 15}
            stroke="var(--color-oxide)"
            strokeWidth="1.7"
          />
          {/* Datum flag: filled triangle, the way a drawing flags a datum. */}
          <path
            d={`M ${xSpot} ${Y_BAND_TOP - 20} l 7 -9 h 62 v -19 h -138 v 19 h 62 z`}
            fill="var(--color-oxide)"
          />
          <text
            x={xSpot}
            y={Y_BAND_TOP - 34}
            textAnchor="middle"
            className="meter"
            fontSize="13"
            fill="var(--color-film)"
          >
            {fmt(priceAt(spotTick))}
          </text>
          {/* Foot: a small filled triangle sitting on the scale. */}
          <path
            d={`M ${xSpot} ${Y_SCALE} l -5 9 h 10 z`}
            fill="var(--color-oxide)"
          />
        </g>
      </svg>
    </figure>
  );
}

/** Filled arrowhead terminator. `dir` 1 points right, -1 points left. */
function Arrow({ x, y, dir }: { x: number; y: number; dir: 1 | -1 }) {
  return (
    <path
      d={`M ${x} ${y} l ${9 * dir} -3.2 v 6.4 z`}
      fill="var(--color-ink-3)"
    />
  );
}

function LimitTag({
  x,
  label,
  value,
  align,
}: {
  x: number;
  label: string;
  value: string;
  align: "start" | "end";
}) {
  const dx = align === "start" ? -8 : 8;
  return (
    <g>
      <text
        x={x + dx}
        y={Y_SCALE + 50}
        textAnchor={align === "start" ? "end" : "start"}
        className="label"
        fontSize="8.5"
        fill="var(--color-ink-4)"
      >
        {label}
      </text>
      <text
        x={x + dx}
        y={Y_SCALE + 66}
        textAnchor={align === "start" ? "end" : "start"}
        className="meter"
        fontSize="12"
        fill="var(--color-ink-2)"
      >
        {value}
      </text>
    </g>
  );
}
