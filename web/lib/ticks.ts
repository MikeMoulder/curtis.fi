import { POOL_META, TOKENS } from "./addresses";

/**
 * Uniswap-V3 tick maths, specialised for this pool.
 *
 * A tick is a 1.0001x step in the raw price of token1 per token0. Because USDT
 * has 6 decimals and WBOT has 18, the raw ratio has to be scaled by
 * 10^(dec0-dec1) before it means anything to a human — skip that and prices
 * come out wrong by a factor of 10^12, which looks plausible enough on a chart
 * to go unnoticed.
 */

const LOG_1_0001 = Math.log(1.0001);
const DECIMAL_SHIFT = TOKENS.usdt.decimals - TOKENS.wbot.decimals; // 6 - 18

/** Price of 1 WBOT denominated in USDT, at the given tick. */
export function tickToWbotPrice(tick: number): number {
  const rawToken1PerToken0 = Math.pow(1.0001, tick) * Math.pow(10, DECIMAL_SHIFT);
  // That is WBOT per USDT; invert for the quote people actually read.
  return 1 / rawToken1PerToken0;
}

/** Inverse of `tickToWbotPrice`, unrounded. */
export function wbotPriceToTick(price: number): number {
  const rawToken1PerToken0 = 1 / price;
  return Math.log(rawToken1PerToken0 / Math.pow(10, DECIMAL_SHIFT)) / LOG_1_0001;
}

/** Snap a tick down to the pool's spacing. V3 rejects unaligned ticks. */
export function alignTick(tick: number, spacing: number = POOL_META.tickSpacing): number {
  return Math.floor(tick / spacing) * spacing;
}

/**
 * Ticks needed to move `pct` percent in price (e.g. 0.05 for 5%).
 * ln(1+pct) / ln(1.0001).
 */
export function pctToTicks(pct: number): number {
  return Math.log(1 + pct) / LOG_1_0001;
}

/** Percentage price move represented by `ticks` ticks. */
export function ticksToPct(ticks: number): number {
  return Math.pow(1.0001, ticks) - 1;
}

/** Where spot sits inside [lower, upper], as 0..1. Clamped. */
export function rangePosition(spot: number, lower: number, upper: number): number {
  if (upper <= lower) return 0.5;
  return Math.min(1, Math.max(0, (spot - lower) / (upper - lower)));
}

/**
 * How far spot has drifted from the range midpoint, as a fraction of the
 * half-width. 0 = perfectly centred, 1 = sitting exactly on an edge, >1 = out
 * of range and earning nothing.
 */
export function drift(spot: number, lower: number, upper: number): number {
  const mid = (lower + upper) / 2;
  const halfWidth = (upper - lower) / 2;
  if (halfWidth <= 0) return 0;
  return Math.abs(spot - mid) / halfWidth;
}

export function isInRange(spot: number, lower: number, upper: number): boolean {
  return spot > lower && spot < upper;
}

/** Format a USDT price for display, with sensible precision for its size. */
export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return "–";
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(4);
  return price.toPrecision(4);
}
