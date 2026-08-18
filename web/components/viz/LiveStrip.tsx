"use client";

import { usePoolSpot } from "@/lib/hooks/useCurtis";
import { tickToWbotPrice, formatPrice } from "@/lib/ticks";

/**
 * A live market readout, sitting above the measured figures.
 *
 * Price and tick are read from the pool contract on every poll rather than
 * baked into the build. A page showing a real, moving number is making a claim
 * that can be checked, which is the posture the whole product takes. The green
 * dots mark the two values that are genuinely live; the pair and fee tier are
 * fixed properties of the pool.
 */
export function LiveStrip() {
  const spot = usePoolSpot();
  const price = spot !== null ? tickToWbotPrice(spot) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
      <Item
        label="WBOT"
        value={price !== null ? `$${formatPrice(price)}` : "–"}
        live={price !== null}
      />
      <Divider />
      <Item label="Pool" value="USDT / WBOT" />
      <Divider />
      <Item label="Fee tier" value="0.30%" />
      <Divider />
      <Item
        label="Tick"
        value={spot !== null ? spot.toLocaleString() : "–"}
        live={spot !== null}
      />
    </div>
  );
}

function Item({ label, value, live = false }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {live && (
        <span
          className="pulse size-1.5 shrink-0 rounded-full bg-[var(--color-good)]"
          aria-hidden="true"
        />
      )}
      <span className="label">{label}</span>
      <span className="tabular text-[13px] text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

function Divider() {
  return <span className="hidden h-3 w-px bg-white/10 sm:block" aria-hidden="true" />;
}
