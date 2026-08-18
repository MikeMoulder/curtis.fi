"use client";

import { usePoolSpot } from "@/lib/hooks/useCurtis";
import { tickToWbotPrice, formatPrice } from "@/lib/ticks";
import { activeChain } from "@/lib/chains";

/**
 * A live readout across the top of the page.
 *
 * The price here is read from the pool contract on every poll, not baked into
 * the build — a landing page that shows a real, moving number is making a
 * claim it can be checked on, which is the entire posture of the product.
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
      <Item label="Network" value={activeChain.name} />
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
