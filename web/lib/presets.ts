import { ticksToPct } from "./ticks";

/**
 * Guardrail presets.
 *
 * These bound what Curtis is *allowed* to choose — they are not the range
 * itself. A tighter `minRangeWidth` permits more aggressive concentration; a
 * lower `maxRebalancesPerDay` caps how often he may churn.
 *
 * Presented to users as percentages, because "600 ticks" is meaningless and
 * "±3%" is immediately legible. The tick values are what the contract stores.
 */
export interface GuardrailPreset {
  id: "conservative" | "balanced" | "active";
  name: string;
  summary: string;
  detail: string;
  minRangeWidth: number;
  maxRangeWidth: number;
  maxRebalancesPerDay: number;
  maxCentreOffset: number;
}

export const PRESETS: GuardrailPreset[] = [
  {
    id: "conservative",
    name: "Conservative",
    summary: "Wide ranges, rare moves",
    detail:
      "Curtis must keep a wide band, so the position stays in range through larger swings and re-centres seldom. Lower fee capture, far less exposure to being caught out of range.",
    minRangeWidth: 1600,
    maxRangeWidth: 12000,
    maxRebalancesPerDay: 3,
    maxCentreOffset: 400,
  },
  {
    id: "balanced",
    name: "Balanced",
    summary: "Moderate concentration",
    detail:
      "Room to concentrate when the market is calm and widen when it is not. Re-centres up to six times a day, which covers normal drift without churning through gas.",
    minRangeWidth: 600,
    maxRangeWidth: 12000,
    maxRebalancesPerDay: 6,
    maxCentreOffset: 300,
  },
  {
    id: "active",
    name: "Active",
    summary: "Tight ranges, frequent moves",
    detail:
      "Permits tight concentration for maximum fee capture, and the frequent re-centring that requires. Highest earning potential and the most sensitive to sharp moves.",
    minRangeWidth: 300,
    maxRangeWidth: 6000,
    maxRebalancesPerDay: 12,
    maxCentreOffset: 150,
  },
];

/** Human label for a range width in ticks, e.g. "±3.0%". */
export function widthLabel(ticks: number): string {
  const halfPct = (ticksToPct(ticks / 2) * 100).toFixed(1);
  return `±${halfPct}%`;
}

export const DEFAULT_PRESET = PRESETS[1];
