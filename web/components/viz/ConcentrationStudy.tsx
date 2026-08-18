"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const COLUMNS = 56;
/** Half-width of the concentrated band, in normalised price units (0..1). */
const BAND = 0.13;

/**
 * The trade-off at the centre of the product, shown rather than described.
 *
 * Two identical amounts of capital sit in the same pool. The top row spreads
 * across every price; the bottom concentrates into a narrow band. Drag the
 * price and watch what each earns — the concentrated row earns many times more
 * while price is inside it, and exactly nothing once price leaves.
 *
 * This replaces what would otherwise be three paragraphs and a diagram nobody
 * reads. The interaction *is* the argument.
 */
export function ConcentrationStudy() {
  const [price, setPrice] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const t = useRef(0);

  /* Drifts on its own until the reader takes over, then stays where they put
     it. An animation that fights the user is worse than none. */
  useEffect(() => {
    if (touched) return;
    const loop = () => {
      t.current += 0.0045;
      setPrice(0.5 + Math.sin(t.current) * 0.30);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [touched]);

  const setFromPointer = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPrice(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromPointer(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, setFromPointer]);

  const inBand = Math.abs(price - 0.5) < BAND;

  // Fee share is proportional to the depth sitting at the current price.
  // Concentrating into 26% of the range multiplies depth by ~1/0.26.
  const concentratedShare = inBand ? 1 / (BAND * 2) : 0;

  return (
    <div className="glass rounded-3xl p-6 sm:p-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label">Interactive</div>
          <h3 className="display mt-3 text-[30px] sm:text-[38px]">
            The same capital,
            <br />
            placed two ways
          </h3>
        </div>
        <p className="max-w-[290px] text-[13px] leading-relaxed text-[var(--color-lo)]">
          Drag the price marker. Watch what each position earns as the market
          moves away from where it started.
        </p>
      </div>

      <div className="mt-10 space-y-9">
        <Row
          title="Spread across every price"
          caption="Always earning. Barely earning."
          columns={flatProfile()}
          price={price}
          active
          tone="neutral"
          yieldLabel="1×"
          yieldNote="baseline"
        />

        <Row
          title="Concentrated near the price"
          caption={
            inBand
              ? "Earning several times more from identical capital"
              : "Price has left the band. This position earns nothing"
          }
          columns={concentratedProfile()}
          price={price}
          active={inBand}
          tone={inBand ? "good" : "bad"}
          yieldLabel={inBand ? `${concentratedShare.toFixed(1)}×` : "0×"}
          yieldNote={inBand ? "while in range" : "out of range"}
        />
      </div>

      {/* the shared price axis — one marker drives both rows */}
      <div className="mt-9">
        <div
          ref={trackRef}
          onPointerDown={(e) => {
            setTouched(true);
            setDragging(true);
            setFromPointer(e.clientX);
          }}
          className="relative h-11 cursor-ew-resize touch-none select-none"
          role="slider"
          aria-label="Market price"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(price * 100)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              setTouched(true);
              setPrice((p) =>
                Math.min(1, Math.max(0, p + (e.key === "ArrowRight" ? 0.03 : -0.03)))
              );
            }
          }}
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/12" />

          {/* ticks */}
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-white/12"
              style={{ left: `${(i / 8) * 100}%` }}
            />
          ))}

          <div
            className="absolute top-0 bottom-0 will-change-transform"
            style={{ left: `${price * 100}%` }}
          >
            <div className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2">
              <span
                className="absolute inset-0 rounded-full border transition-colors duration-300"
                style={{
                  borderColor: inBand ? "var(--color-good)" : "var(--color-bad)",
                  background: "var(--color-void)",
                  boxShadow: `0 0 16px 2px ${
                    inBand ? "rgb(74 222 128 / 0.5)" : "rgb(251 113 133 / 0.5)"
                  }`,
                }}
              />
              <span
                className="absolute inset-[5px] rounded-full transition-colors duration-300"
                style={{ background: inBand ? "var(--color-good)" : "var(--color-bad)" }}
              />
            </div>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="label">Lower</span>
          <span className="label">{dragging || touched ? "Market price" : "Drag me"}</span>
          <span className="label">Higher</span>
        </div>
      </div>

      <div className="rule-fade my-8" />

      <p className="max-w-[640px] text-[13.5px] leading-relaxed text-[var(--color-mid)]">
        That is the whole job. Concentration multiplies what capital earns and
        narrows the window in which it earns anything, and the right window
        moves whenever the price does. Curtis holds the band over the price
        continuously, and widens it when the market gets rough.
      </p>
    </div>
  );
}

/* ── profiles ─────────────────────────────────────────────────────────────── */

function flatProfile(): number[] {
  return Array.from({ length: COLUMNS }, () => 0.17);
}

function concentratedProfile(): number[] {
  const centre = (COLUMNS - 1) / 2;
  const halfCols = BAND * COLUMNS;
  return Array.from({ length: COLUMNS }, (_, i) => {
    const d = Math.abs(i - centre);
    if (d > halfCols) return 0;
    // Slight dome rather than a flat slab — reads as depth, not a block.
    return 0.55 + 0.45 * Math.cos((d / halfCols) * (Math.PI / 2));
  });
}

/* ── one row ──────────────────────────────────────────────────────────────── */

function Row({
  title,
  caption,
  columns,
  price,
  active,
  tone,
  yieldLabel,
  yieldNote,
}: {
  title: string;
  caption: string;
  columns: number[];
  price: number;
  active: boolean;
  tone: "neutral" | "good" | "bad";
  yieldLabel: string;
  yieldNote: string;
}) {
  const priceCol = Math.round(price * (COLUMNS - 1));

  const COLOR =
    tone === "good"
      ? "var(--color-good)"
      : tone === "bad"
        ? "var(--color-bad)"
        : "var(--color-accent-dim)";

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-[14px] font-medium text-[var(--color-ink)]">{title}</h4>
        <div className="flex items-baseline gap-2">
          <span
            className="tabular text-[19px] font-semibold transition-colors duration-300"
            style={{ color: active ? COLOR : "var(--color-faint)" }}
          >
            {yieldLabel}
          </span>
          <span className="label">{yieldNote}</span>
        </div>
      </div>

      <div className="mt-3 flex h-[76px] items-end gap-[2px]">
        {columns.map((h, i) => {
          const isHere = i === priceCol;
          const lit = h > 0 && Math.abs(i - priceCol) <= 1;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-[2px] transition-all duration-300"
              style={{
                height: `${Math.max(h * 100, 1.5)}%`,
                background:
                  h === 0
                    ? "rgb(255 255 255 / 0.045)"
                    : lit
                      ? COLOR
                      : `color-mix(in srgb, ${COLOR} ${active ? 42 : 20}%, transparent)`,
                boxShadow: isHere && h > 0 ? `0 0 14px 1px ${COLOR}` : undefined,
              }}
            />
          );
        })}
      </div>

      <p
        className="mt-3 text-[12.5px] transition-colors duration-300"
        style={{ color: active ? "var(--color-mid)" : "var(--color-faint)" }}
      >
        {caption}
      </p>
    </div>
  );
}
