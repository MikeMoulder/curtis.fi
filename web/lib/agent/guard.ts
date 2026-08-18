import type { Decision } from "./decide";
import type { Signals } from "./signals";
import { pctToTicks, ticksToPct } from "@/lib/ticks";

export interface Plan {
  action: Decision["action"];
  tickLower: number;
  tickUpper: number;
  halfWidthTicks: number;
  /** What the model asked for, before clamping. Kept for the audit trail. */
  requestedHalfWidthPct: number;
  /** What it became after clamping and alignment. */
  effectiveHalfWidthPct: number;
  clamped: boolean;
}

export type GuardResult =
  | { ok: true; plan: Plan }
  | { ok: false; reason: string; detail: string };

/**
 * Turn a decision into an executable plan, or refuse it.
 *
 * This mirrors every check `CurtisVault` performs on-chain. Duplicating them
 * is deliberate: the contract is the authority, but a rejection there costs a
 * reverted transaction and real gas, and tells the user nothing useful. Failing
 * here is free and can explain itself.
 *
 * It fails closed throughout. Anything unrecognised, out of bounds, or merely
 * suspicious becomes a refusal rather than a best guess.
 */
export function guard(decision: Decision, s: Signals): GuardResult {
  if (s.paused) {
    return { ok: false, reason: "paused", detail: "The vault is paused by its owner." };
  }

  if (decision.action === "hold") {
    return {
      ok: false,
      reason: "hold",
      detail: decision.reasoning || "No action judged worthwhile this cycle.",
    };
  }

  if (!Number.isFinite(decision.confidenceBps) || decision.confidenceBps < 0) {
    return { ok: false, reason: "bad-confidence", detail: "Confidence was not a valid number." };
  }
  const confidence = Math.min(10_000, Math.round(decision.confidenceBps));

  if (decision.action === "compound") {
    if (!s.position.exists) {
      return {
        ok: false,
        reason: "nothing-to-compound",
        detail: "Compounding was chosen but no position is open.",
      };
    }
    return {
      ok: true,
      plan: {
        action: "compound",
        tickLower: s.position.tickLower,
        tickUpper: s.position.tickUpper,
        halfWidthTicks: s.position.widthTicks / 2,
        requestedHalfWidthPct: 0,
        effectiveHalfWidthPct: ticksToPct(s.position.widthTicks / 2) * 100,
        clamped: false,
      },
    };
  }

  // open / rebalance from here on.

  if (decision.action === "open" && s.position.exists) {
    return {
      ok: false,
      reason: "already-open",
      detail: "Opening was chosen but a position already exists; a rebalance was meant.",
    };
  }

  if (!s.position.exists && !s.idle.hasFunds) {
    return {
      ok: false,
      reason: "no-funds",
      detail: "No position and no idle balance. There is nothing to deploy.",
    };
  }

  if (s.rebalancesRemaining <= 0) {
    return {
      ok: false,
      reason: "rate-limited",
      detail: `The daily limit of ${s.guardrails.maxRebalancesPerDay} moves is already spent.`,
    };
  }

  const pct = decision.targetHalfWidthPct;
  if (!Number.isFinite(pct) || pct <= 0 || pct > 90) {
    return {
      ok: false,
      reason: "bad-width",
      detail: `Requested half-width of ${pct}% is not a usable number.`,
    };
  }

  const { halfWidthTicks, clamped } = fitHalfWidth(pct, s);
  const width = halfWidthTicks * 2;

  // Re-check the clamped result rather than trusting the clamp.
  if (width < s.guardrails.minRangeWidth || width > s.guardrails.maxRangeWidth) {
    return {
      ok: false,
      reason: "width-out-of-bounds",
      detail: `A width of ${width} ticks does not fit the owner's bounds of ${s.guardrails.minRangeWidth} to ${s.guardrails.maxRangeWidth}.`,
    };
  }

  const mid = alignDown(s.spotTick, s.tickSpacing);
  const tickLower = mid - halfWidthTicks;
  const tickUpper = mid + halfWidthTicks;

  if (tickLower % s.tickSpacing !== 0 || tickUpper % s.tickSpacing !== 0) {
    return {
      ok: false,
      reason: "misaligned",
      detail: "Computed ticks are not multiples of the pool's tick spacing.",
    };
  }

  if (s.spotTick <= tickLower || s.spotTick >= tickUpper) {
    return {
      ok: false,
      reason: "not-straddling",
      detail: "The computed band does not contain the current price.",
    };
  }

  const centreOffset = Math.abs(s.spotTick - (tickLower + tickUpper) / 2);
  if (centreOffset > s.guardrails.maxCentreOffset) {
    return {
      ok: false,
      reason: "off-centre",
      detail: `The band's centre is ${centreOffset} ticks from spot, beyond the ${s.guardrails.maxCentreOffset} allowed.`,
    };
  }

  void confidence; // validated above; carried separately to the executor

  return {
    ok: true,
    plan: {
      action: decision.action,
      tickLower,
      tickUpper,
      halfWidthTicks,
      requestedHalfWidthPct: pct,
      effectiveHalfWidthPct: ticksToPct(halfWidthTicks) * 100,
      clamped,
    },
  };
}

/**
 * Convert a requested percentage into a tick half-width that is a whole number
 * of tick spacings and sits inside the owner's bounds.
 *
 * Order matters: round to the spacing first, then clamp. Clamping first and
 * rounding after can push the result back outside the bound it was just
 * clamped into.
 */
function fitHalfWidth(pct: number, s: Signals): { halfWidthTicks: number; clamped: boolean } {
  const spacing = s.tickSpacing;
  const raw = pctToTicks(pct / 100);

  let half = Math.round(raw / spacing) * spacing;

  const minHalf = Math.ceil(s.guardrails.minRangeWidth / 2 / spacing) * spacing;
  const maxHalf = Math.floor(s.guardrails.maxRangeWidth / 2 / spacing) * spacing;

  const before = half;
  half = Math.max(half, minHalf, spacing);
  half = Math.min(half, maxHalf);

  return { halfWidthTicks: half, clamped: half !== before };
}

/** Floor a tick to the nearest multiple of `spacing`, correct for negatives. */
function alignDown(tick: number, spacing: number): number {
  const aligned = Math.floor(tick / spacing) * spacing;
  return aligned;
}
