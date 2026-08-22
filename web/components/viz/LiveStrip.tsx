"use client";

import { usePoolSpot } from "@/lib/hooks/useCurtis";
import { tickToWbotPrice, formatPrice } from "@/lib/ticks";

/**
 * A live market readout, set as an instrument row.
 *
 * Price and tick come from the pool contract on every poll rather than being
 * baked into the build, and only those two carry the oxide dot — the pair and
 * the fee tier are fixed properties of the pool, and marking them live would
 * make the whole row a lie by association.
 */
export function LiveStrip() {
  const spot = usePoolSpot();
  const price = spot !== null ? tickToWbotPrice(spot) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-9 gap-y-3">
      <Item label="WBOT" value={price !== null ? `$${formatPrice(price)}` : "—"} live={price !== null} />
      <Divider />
      <Item label="Tick" value={spot !== null ? spot.toLocaleString() : "—"} live={spot !== null} />
      <Divider />
      <Item label="Pool" value="USDT / WBOT" />
      <Divider />
      <Item label="Fee tier" value="0.30%" />
      <Divider />
      <Item label="Spacing" value="60" />
    </div>
  );
}

function Item({ label, value, live = false }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {live && (
        <span
          className="pulse size-[5px] shrink-0 bg-[var(--color-oxide)]"
          aria-hidden="true"
        />
      )}
      <span className="label">{label}</span>
      <span className="meter text-[12.5px] text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

function Divider() {
  return <span className="hidden h-3 w-px bg-[var(--hair-2)] sm:block" aria-hidden="true" />;
}
