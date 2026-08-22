"use client";

import { usePoolSpot } from "@/lib/hooks/useCurtis";
import { ToleranceGauge } from "@/components/viz/ToleranceGauge";
import { pctToTicks, tickToWbotPrice, formatPrice } from "@/lib/ticks";

/**
 * Measured 15 August 2026, and re-checked against both pools on 21 August:
 * mainnet 677 reported tick 253,630 and Bohr 968 reported 253,610 — twenty
 * ticks apart, which is 0.2% and indistinguishable at this scale.
 *
 * It exists only to hold the gauge's geometry for the instant before the first
 * `slot0` read lands, and for anyone viewing with JavaScript disabled. The
 * moment the live tick arrives it replaces this, and the caption says which of
 * the two the reader is looking at.
 */
const FALLBACK_TICK = 253_630;

/**
 * The band drawn in the hero is ±4.50%, which is not arbitrary: it is roughly
 * what the policy engine picks for this pool's observed volatility. The gauge
 * rounds it to whole tick spacings, landing on 840 ticks.
 *
 * The small drift offset is there because a needle sitting exactly on centre
 * looks staged, and the interesting state — price wandering off centre while
 * still inside tolerance — is the one worth drawing.
 */
const HALF_WIDTH_PCT = 4.5;
export function HeroGauge() {
  const live = usePoolSpot();
  const tick = live ?? FALLBACK_TICK;

  // Derived, never stated. The gauge rounds the requested ±4.50% to whole tick
  // spacings exactly as the guard does, so writing the figure by hand here
  // would drift out of agreement with the drawing the moment either changed.
  const halfTicks = Math.round(pctToTicks(HALF_WIDTH_PCT / 100) / 60) * 60;

  return (
    <div>
      <ToleranceGauge
        spotTick={tick}
        halfWidthPct={HALF_WIDTH_PCT}
        driftFraction={0.34}
      />

      {/* The gauge's caption is also the site's live readout. There used to be a
          separate ticker above the hero carrying price, tick, pair, tier and
          spacing; four of those five already appear within a screen of it, and
          a figure stated twice is a figure the reader has to reconcile. */}
      <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-[var(--hair)] pt-4">
        <span className="flex items-center gap-2.5">
          <span
            className={`size-[5px] shrink-0 ${
              live ? "pulse bg-[var(--color-oxide)]" : "bg-[var(--color-ink-4)]"
            }`}
            aria-hidden="true"
          />
          <span className="label">{live ? "Live from pool" : "Last measurement"}</span>
        </span>

        <Read k="WBOT" v={`$${formatPrice(tickToWbotPrice(tick))}`} />
        <Read k="Tick" v={tick.toLocaleString()} />
        <Read k="Band" v={`${halfTicks * 2} ticks`} />
        <Read k="Spacing" v="60" />
      </div>
    </div>
  );
}

function Read({ k, v }: { k: string; v: string }) {
  return (
    <span className="flex items-baseline gap-2.5">
      <span className="label !text-[var(--color-ink-4)]">{k}</span>
      <span className="meter text-[12.5px] text-[var(--color-ink-2)]">{v}</span>
    </span>
  );
}
