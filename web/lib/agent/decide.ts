import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Signals } from "./signals";
import { ticksToPct } from "@/lib/ticks";

/**
 * What the model is allowed to decide.
 *
 * Note what is absent: raw ticks. The model chooses a band *width as a
 * percentage* and whether to act; the code converts that into aligned ticks
 * centred on spot. Tick arithmetic is exact, unforgiving and completely
 * mechanical, so it stays in code where it can be tested. The model is asked
 * only for the judgement that genuinely needs judgement.
 */
export const DecisionSchema = z.object({
  action: z
    .enum(["open", "rebalance", "compound", "hold"])
    .describe(
      "open: no position exists, create one. rebalance: re-centre the existing position. compound: collect fees and fold them back into the same range. hold: do nothing this cycle."
    ),
  targetHalfWidthPct: z
    .number()
    .describe(
      "Half-width of the band as a percentage of price, e.g. 4.5 means roughly plus or minus 4.5 percent around spot. Ignored when action is hold or compound."
    ),
  confidenceBps: z
    .number()
    .int()
    .describe("Confidence in this decision, 0 to 10000 basis points."),
  reasoning: z
    .string()
    .describe(
      "One sentence, at most 180 characters, stating why. This is written to the blockchain and shown to the user, so it must be specific and free of filler."
    ),
});

export type Decision = z.infer<typeof DecisionSchema>;

const SYSTEM = `You are Curtis, an agent that manages a single concentrated-liquidity position on BDEX, a Uniswap-V3-style DEX on BOT Chain.

Your position earns trading fees only while the market price sits inside the tick range you chose. A narrower band concentrates capital and earns multiples more per unit while in range, but leaves that range sooner. A wider band earns less but survives larger moves.

You are deciding what to do for one cycle. Judge four things:

1. Width. Size the band against how far price has actually moved recently, not against a fixed rule. If the observed drift over the last day is a fraction of a percent, a tight band is justified. If price has swung several percent, widen. A sensible band is usually two to four times the observed drift, so price stays inside it between your cycles.

2. Whether acting is worth it. Every rebalance costs gas and realises any divergence loss. If the position is still well centred and comfortably in range, hold. Choosing not to act is the most common correct answer and is not a failure.

3. Compounding. If the position is healthy and in range but fees have accrued, compounding folds them back in without re-ranging and does not consume the daily rebalance budget.

4. Honesty about confidence. Low confidence is informative. Do not inflate it.

Hard constraints, which the vault enforces independently and will reject you for breaking:
- The band must straddle the current price and sit near its centre.
- The width must fall between the owner's configured minimum and maximum.
- You have a limited number of rebalances per day.

If there are no idle funds and no existing position, there is nothing to do: hold.
If the vault is paused, hold.

Your reasoning is written to the blockchain permanently and shown to the position's owner. State the actual cause, cite the numbers you relied on, and never pad it.`;

/**
 * Ask the model for a decision.
 *
 * Adaptive thinking is on because this is a genuine judgement call under
 * uncertainty, and effort is capped at medium because the input is small and
 * the shape of the problem is fixed: the model is weighing four numbers, not
 * exploring a space.
 */
export async function decide(signals: Signals): Promise<{
  decision: Decision;
  raw: string;
  model: string;
}> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    system: SYSTEM,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: zodOutputFormat(DecisionSchema),
    },
    messages: [{ role: "user", content: renderSignals(signals) }],
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    // Fail closed. A decision we cannot read is not a decision.
    throw new Error("Model returned no parseable decision");
  }

  return {
    decision: parsed,
    raw: JSON.stringify(parsed),
    model: response.model,
  };
}

/**
 * The signals as prose plus figures.
 *
 * Deliberately not raw JSON: units and their meaning are spelled out, because
 * "driftFraction: 0.82" invites a guess where "82% of the way to the edge"
 * does not.
 */
function renderSignals(s: Signals): string {
  const lines: string[] = [];

  lines.push(`MARKET`);
  lines.push(`Pair USDT/WBOT, ${(s.feeTier / 10000).toFixed(2)}% fee tier.`);
  lines.push(`Current price: ${s.spotPrice.toFixed(4)} USDT per WBOT (tick ${s.spotTick}).`);

  if (s.twaps.length) {
    lines.push(`Time-weighted average price by lookback:`);
    for (const t of s.twaps) {
      const pct = (ticksToPct(Math.abs(t.deviationTicks)) * 100).toFixed(3);
      const label =
        t.windowSeconds >= 3600 ? `${t.windowSeconds / 3600}h` : `${t.windowSeconds / 60}m`;
      lines.push(
        `  ${label.padEnd(4)} tick ${t.tick}, which is ${pct}% from the current price.`
      );
    }
    lines.push(
      `Largest observed move over the last ${
        s.oracleHorizonSeconds >= 3600
          ? `${s.oracleHorizonSeconds / 3600} hours`
          : `${s.oracleHorizonSeconds / 60} minutes`
      }: ${s.observedDriftPct.toFixed(3)}%.`
    );
  } else {
    lines.push(`No price history available from the pool oracle.`);
  }

  lines.push(``);
  lines.push(`POSITION`);
  if (s.position.exists) {
    const widthPct = (ticksToPct(s.position.widthTicks / 2) * 100).toFixed(2);
    lines.push(
      `Open, band is roughly plus or minus ${widthPct}% (ticks ${s.position.tickLower} to ${s.position.tickUpper}).`
    );
    lines.push(
      s.position.inRange
        ? `Price is inside the band, ${(s.position.driftFraction * 100).toFixed(0)}% of the way from the centre to the nearest edge.`
        : `Price has left the band. The position is earning nothing.`
    );
  } else {
    lines.push(`None open.`);
  }

  lines.push(``);
  lines.push(`VAULT`);
  lines.push(
    `Idle funds waiting to be deployed: ${s.idle.hasFunds ? "yes" : "no"} (${s.idle.usdt} USDT base units, ${s.idle.wbot} WBOT base units).`
  );
  lines.push(`Rebalances left today: ${s.rebalancesRemaining} of ${s.guardrails.maxRebalancesPerDay}.`);
  lines.push(`Paused: ${s.paused ? "yes" : "no"}.`);

  lines.push(``);
  lines.push(`LIMITS SET BY THE OWNER`);
  lines.push(
    `Narrowest band allowed: plus or minus ${(ticksToPct(s.guardrails.minRangeWidth / 2) * 100).toFixed(2)}%.`
  );
  lines.push(
    `Widest band allowed: plus or minus ${(ticksToPct(s.guardrails.maxRangeWidth / 2) * 100).toFixed(2)}%.`
  );
  lines.push(
    `The band's centre must sit within ${(ticksToPct(s.guardrails.maxCentreOffset) * 100).toFixed(2)}% of the current price.`
  );

  lines.push(``);
  lines.push(`COST`);
  lines.push(`One rebalance costs about ${s.gas.rebalanceCostBot.toFixed(4)} BOT in gas.`);

  return lines.join("\n");
}
