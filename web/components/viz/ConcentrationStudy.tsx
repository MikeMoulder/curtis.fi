"use client";

import { SectionRule } from "@/components/ui/SectionRule";

/**
 * WIDTH IS THE WHOLE PROBLEM — section study.
 *
 * The diagram's one idea: capital is drawn as AREA, so both bands enclose the
 * same number of square units. Halve the width and the bar must get twice as
 * tall to hold the same money — and that height is liquidity depth, which is
 * what actually earns fees. The geometry is not a metaphor for how V3 works,
 * it is how V3 works, which is why this is worth drawing rather than asserting
 * in a paragraph.
 *
 * Both bands share one price axis so the comparison cannot cheat, and the
 * hatching thickens with depth for the same reason.
 *
 * Capital efficiency is the standard V3 result for a range [Pa, Pb] around P:
 *
 *     E = 1 / (1 − (Pa/Pb)^¼)
 *
 * ±20.00% → 10.4×.  ±4.50% → 44.9×.  Both computed below, not rounded by hand,
 * and both true only while price is inside the band — which is the entire
 * catch, and the reason the rest of this product exists.
 */

const W = 1000;
const H = 470;
const PAD = 66;

/** The axis spans ±26%, so a ±20% band does not run to the sheet edge. */
const SPAN = 26;

const WIDE = 20;
const NARROW = 4.5;

/** Equal-area constant, in px². Sets both bar heights from their own widths. */
const AREA = 19_800;

const px = (pct: number) => (pct / SPAN) * (W / 2 - PAD);
const x = (pct: number) => W / 2 + px(pct);

/** E = 1 / (1 − (Pa/Pb)^¼) */
function efficiency(halfPct: number): number {
  const ratio = (1 - halfPct / 100) / (1 + halfPct / 100);
  return 1 / (1 - Math.pow(ratio, 0.25));
}

const Y_AXIS = 400;
const ROW_1 = 150; // baseline of the wide bar
const ROW_2 = 356; // baseline of the narrow bar

export function ConcentrationStudy() {
  const wideW = px(WIDE) * 2;
  const narrowW = px(NARROW) * 2;
  const wideH = AREA / wideW;
  const narrowH = AREA / narrowW;

  const eWide = efficiency(WIDE);
  const eNarrow = efficiency(NARROW);

  return (
    <div>
      <SectionRule
        title="Width is the whole problem"
        aside="Section study · equal capital"
      />

      <div className="mt-8 grid gap-x-14 gap-y-10 lg:grid-cols-[1.35fr_0.65fr]">
        <figure>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={`Two liquidity bands drawn to equal area on one price axis. A wide band of plus or minus ${WIDE} percent is shallow and spans most of the axis, giving ${eWide.toFixed(
              1
            )} times the depth of a full-range position. A narrow band of plus or minus ${NARROW} percent is ${(
              narrowH / wideH
            ).toFixed(1)} times deeper but covers a fraction of the axis, giving ${eNarrow.toFixed(
              1
            )} times.`}
          >
            <defs>
              <pattern id="cs-sparse" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="9" stroke="var(--color-prussian)" strokeWidth="0.9" strokeOpacity="0.34" />
              </pattern>
              <pattern id="cs-dense" width="3.2" height="3.2" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="3.2" stroke="var(--color-prussian)" strokeWidth="0.9" strokeOpacity="0.5" />
              </pattern>
            </defs>

            {/* ── centre datum, running the full height ────────────────── */}
            <line
              x1={W / 2}
              y1={40}
              x2={W / 2}
              y2={Y_AXIS + 16}
              stroke="var(--color-oxide)"
              strokeWidth="1.1"
              strokeDasharray="7 4"
              strokeOpacity="0.65"
            />

            {/* ── row 1: the wide band ─────────────────────────────────── */}
            <Bar
              y={ROW_1}
              height={wideH}
              left={x(-WIDE)}
              right={x(WIDE)}
              fill="url(#cs-sparse)"
            />
            <DepthDim
              x={x(-WIDE)}
              yTop={ROW_1 - wideH}
              yBot={ROW_1}
              label={`${eWide.toFixed(1)}×`}
            />
            <WidthDim
              y={ROW_1 + 26}
              left={x(-WIDE)}
              right={x(WIDE)}
              label={`±${WIDE.toFixed(2)}%`}
            />
            <text x={PAD - 46} y={ROW_1 - wideH - 14} className="label" fontSize="9" fill="var(--color-ink-3)">
              WIDE
            </text>

            {/* ── row 2: the narrow band ───────────────────────────────── */}
            <Bar
              y={ROW_2}
              height={narrowH}
              left={x(-NARROW)}
              right={x(NARROW)}
              fill="url(#cs-dense)"
            />
            <DepthDim
              x={x(-NARROW)}
              yTop={ROW_2 - narrowH}
              yBot={ROW_2}
              label={`${eNarrow.toFixed(1)}×`}
            />
            <WidthDim
              y={ROW_2 + 26}
              left={x(-NARROW)}
              right={x(NARROW)}
              label={`±${NARROW.toFixed(2)}%`}
            />
            <text x={PAD - 46} y={ROW_2 - narrowH - 14} className="label" fontSize="9" fill="var(--color-ink-3)">
              NARROW
            </text>

            {/* ── the shared price axis ────────────────────────────────── */}
            <line x1={PAD - 26} y1={Y_AXIS} x2={W - PAD + 26} y2={Y_AXIS} stroke="var(--color-ink)" strokeWidth="1.2" />
            {Array.from({ length: 27 }, (_, i) => i - 13).map((step) => {
              const pct = step * 2;
              if (Math.abs(pct) > SPAN) return null;
              const major = step % 5 === 0;
              return (
                <g key={step}>
                  <line
                    x1={x(pct)}
                    y1={Y_AXIS}
                    x2={x(pct)}
                    y2={Y_AXIS + (major ? 12 : 6)}
                    stroke={major ? "var(--color-ink-2)" : "var(--color-ink-4)"}
                    strokeWidth={major ? 1.2 : 0.8}
                  />
                  {major && (
                    <text
                      x={x(pct)}
                      y={Y_AXIS + 28}
                      textAnchor="middle"
                      className="meter"
                      fontSize="10"
                      fill="var(--color-ink-3)"
                    >
                      {pct > 0 ? `+${pct}` : pct}%
                    </text>
                  )}
                </g>
              );
            })}
            <text x={W / 2} y={Y_AXIS + 50} textAnchor="middle" className="label" fontSize="8.5" fill="var(--color-ink-4)">
              PRICE, RELATIVE TO SPOT
            </text>
          </svg>
        </figure>

        <div className="lg:pt-2">
          <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)]">
            Both bars hold the same money. The narrow one is{" "}
            <strong className="font-normal text-[var(--color-ink)]">
              {(narrowH / wideH).toFixed(1)}× deeper
            </strong>{" "}
            purely because it is {(wideW / narrowW).toFixed(1)}× shorter, and depth
            is what collects fees.
          </p>

          {/* The trade-off used to be spelled out in a paragraph here as well as
              in these two notes. Once is enough. */}
          <div className="mt-7 border-t border-[var(--color-ink)]">
            <Row k={`±${WIDE.toFixed(2)}% band`} v={`${eWide.toFixed(1)}× depth`} note="survives a large move, earns little" />
            <Row k={`±${NARROW.toFixed(2)}% band`} v={`${eNarrow.toFixed(1)}× depth`} note="earns well, leaves the band sooner" measured />
          </div>

          <p className="mt-6 text-[12.5px] leading-relaxed text-[var(--color-ink-4)]">
            Depth multiples are relative to a full-range position, from
            E&nbsp;=&nbsp;1&nbsp;/&nbsp;(1&nbsp;−&nbsp;(P<sub>a</sub>/P<sub>b</sub>)<sup>¼</sup>).
            Both hold only while price sits inside the band. Choosing the width, and
            moving it before price leaves, is Curtis&rsquo;s entire job.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── drawing primitives ──────────────────────────────────────────────────── */

function Bar({
  y,
  height,
  left,
  right,
  fill,
}: {
  y: number;
  height: number;
  left: number;
  right: number;
  fill: string;
}) {
  return (
    <g>
      <rect x={left} y={y - height} width={right - left} height={height} fill={fill} />
      <rect
        x={left}
        y={y - height}
        width={right - left}
        height={height}
        fill="none"
        stroke="var(--color-prussian)"
        strokeWidth="1.5"
      />
    </g>
  );
}

/** Vertical dimension with arrow terminators — the depth callout. */
function DepthDim({
  x: xPos,
  yTop,
  yBot,
  label,
}: {
  x: number;
  yTop: number;
  yBot: number;
  label: string;
}) {
  const dx = xPos - 30;
  return (
    <g>
      <line x1={dx} y1={yTop} x2={dx} y2={yBot} stroke="var(--color-ink-3)" strokeWidth="0.9" />
      <path d={`M ${dx} ${yTop} l -3.2 9 h 6.4 z`} fill="var(--color-ink-3)" />
      <path d={`M ${dx} ${yBot} l -3.2 -9 h 6.4 z`} fill="var(--color-ink-3)" />
      {/* extension lines, gapped from the object per convention */}
      <line x1={dx - 6} y1={yTop} x2={xPos - 5} y2={yTop} stroke="var(--hair-2)" strokeWidth="0.8" />
      <line x1={dx - 6} y1={yBot} x2={xPos - 5} y2={yBot} stroke="var(--hair-2)" strokeWidth="0.8" />
      <text
        x={dx - 10}
        y={(yTop + yBot) / 2 + 4}
        textAnchor="end"
        className="meter"
        fontSize="14"
        fill="var(--color-ink)"
      >
        {label}
      </text>
    </g>
  );
}

/** Horizontal dimension with the figure breaking the line. */
function WidthDim({
  y,
  left,
  right,
  label,
}: {
  y: number;
  left: number;
  right: number;
  label: string;
}) {
  const mid = (left + right) / 2;
  return (
    <g>
      <line x1={left} y1={y} x2={right} y2={y} stroke="var(--color-ink-3)" strokeWidth="0.9" />
      <path d={`M ${left} ${y} l 9 -3.2 v 6.4 z`} fill="var(--color-ink-3)" />
      <path d={`M ${right} ${y} l -9 -3.2 v 6.4 z`} fill="var(--color-ink-3)" />
      <rect x={mid - 42} y={y - 9} width="84" height="18" fill="var(--color-film)" />
      <text x={mid} y={y + 4} textAnchor="middle" className="meter" fontSize="12.5" fill="var(--color-ink)">
        {label}
      </text>
    </g>
  );
}

function Row({
  k,
  v,
  note,
  measured = false,
}: {
  k: string;
  v: string;
  note: string;
  measured?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hair)] py-3">
      <div>
        <div className="meter text-[12.5px] text-[var(--color-ink)]">{k}</div>
        <div className="mt-1 text-[12px] text-[var(--color-ink-3)]">{note}</div>
      </div>
      <div
        className={`meter shrink-0 text-[15px] ${
          measured ? "text-[var(--color-oxide)]" : "text-[var(--color-ink-2)]"
        }`}
      >
        {v}
      </div>
    </div>
  );
}
