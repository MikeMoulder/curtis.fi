import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { botChain, bohrTestnet, ACTIVE_CHAIN_ID } from "@/lib/chains";
import { addresses, POOL_META } from "@/lib/addresses";
import { CurtisVaultAbi } from "@/lib/abis/CurtisVault";
import { ticksToPct, tickToWbotPrice } from "@/lib/ticks";

export const chainForAgent = ACTIVE_CHAIN_ID === 677 ? botChain : bohrTestnet;

export function publicClient(): PublicClient {
  return createPublicClient({ chain: chainForAgent, transport: http() }) as PublicClient;
}

const POOL_ABI = [
  {
    name: "slot0",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
  {
    name: "observe",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "secondsAgos", type: "uint32[]" }],
    outputs: [
      { name: "tickCumulatives", type: "int56[]" },
      { name: "secondsPerLiquidityCumulativeX128", type: "uint160[]" },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

/** Lookback windows for the volatility probe, in seconds. */
const WINDOWS = [900, 3600, 21600, 86400] as const;

export interface Signals {
  chainId: number;
  spotTick: number;
  spotPrice: number;
  /**
   * Widest gap between spot and any TWAP window, in ticks. Stands in for
   * realised volatility: how far price has actually wandered recently.
   */
  observedDriftTicks: number;
  /** The same figure as a percentage price move. */
  observedDriftPct: number;
  /** Per-window TWAP ticks, for the model to see the shape of the move. */
  twaps: { windowSeconds: number; tick: number; deviationTicks: number }[];
  /** How far back the oracle could actually answer. */
  oracleHorizonSeconds: number;

  position: {
    exists: boolean;
    tickLower: number;
    tickUpper: number;
    widthTicks: number;
    inRange: boolean;
    /** 0 = centred, 1 = sitting on an edge, >1 = out of range. */
    driftFraction: number;
  };

  guardrails: {
    minRangeWidth: number;
    maxRangeWidth: number;
    maxRebalancesPerDay: number;
    maxCentreOffset: number;
  };

  rebalancesRemaining: number;
  paused: boolean;

  idle: { usdt: bigint; wbot: bigint; hasFunds: boolean };

  gas: {
    priceWei: bigint;
    /** Rough cost of one rebalance in native BOT. */
    rebalanceCostBot: number;
  };

  tickSpacing: number;
  feeTier: number;
}

/**
 * Everything the decision needs, read from chain.
 *
 * Volatility comes from the pool's own TWAP oracle rather than the subgraph:
 * `observe()` works identically on both networks, while the subgraph only
 * indexes mainnet. Depending on it would mean the agent could not be rehearsed
 * on testnet, which is where it has to be proven first.
 */
export async function gatherSignals(vault: Address): Promise<Signals> {
  const client = publicClient();
  const pool = addresses.pool;

  const [slot0, guardrailsRaw, positionRaw, remaining, paused, usdtBal, wbotBal, gasPrice] =
    await Promise.all([
      client.readContract({ address: pool, abi: POOL_ABI, functionName: "slot0" }),
      client.readContract({ address: vault, abi: CurtisVaultAbi, functionName: "guardrails" }),
      client.readContract({ address: vault, abi: CurtisVaultAbi, functionName: "positionInfo" }),
      client.readContract({
        address: vault,
        abi: CurtisVaultAbi,
        functionName: "rebalancesRemainingToday",
      }),
      client.readContract({ address: vault, abi: CurtisVaultAbi, functionName: "paused" }),
      client.readContract({
        address: addresses.usdt,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [vault],
      }),
      client.readContract({
        address: addresses.wbot,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [vault],
      }),
      client.getGasPrice(),
    ]);

  const spotTick = Number((slot0 as readonly unknown[])[1]);

  const { twaps, horizon } = await probeOracle(client, pool, spotTick);
  const observedDriftTicks = twaps.reduce((m, t) => Math.max(m, Math.abs(t.deviationTicks)), 0);

  const g = guardrailsRaw as readonly unknown[];
  const p = positionRaw as readonly unknown[];

  const tickLower = Number(p[0]);
  const tickUpper = Number(p[1]);
  const liquidity = p[2] as bigint;
  const exists = liquidity > 0n;
  const widthTicks = exists ? tickUpper - tickLower : 0;
  const mid = (tickLower + tickUpper) / 2;
  const half = widthTicks / 2;

  // One rebalance measured at ~950k gas in the fork tests; exits and re-mints
  // land in that neighbourhood.
  const REBALANCE_GAS = 950_000n;

  return {
    chainId: chainForAgent.id,
    spotTick,
    spotPrice: tickToWbotPrice(spotTick),
    observedDriftTicks,
    observedDriftPct: ticksToPct(observedDriftTicks) * 100,
    twaps,
    oracleHorizonSeconds: horizon,
    position: {
      exists,
      tickLower,
      tickUpper,
      widthTicks,
      inRange: Boolean(p[4]),
      driftFraction: exists && half > 0 ? Math.abs(spotTick - mid) / half : 0,
    },
    guardrails: {
      minRangeWidth: Number(g[0]),
      maxRangeWidth: Number(g[1]),
      maxRebalancesPerDay: Number(g[2]),
      maxCentreOffset: Number(g[3]),
    },
    rebalancesRemaining: Number(remaining as bigint),
    paused: Boolean(paused),
    idle: {
      usdt: usdtBal as bigint,
      wbot: wbotBal as bigint,
      hasFunds: (usdtBal as bigint) > 0n || (wbotBal as bigint) > 0n,
    },
    gas: {
      priceWei: gasPrice,
      rebalanceCostBot: Number((gasPrice * REBALANCE_GAS) / 10n ** 12n) / 1e6,
    },
    tickSpacing: POOL_META.tickSpacing,
    feeTier: POOL_META.feeTier,
  };
}

/**
 * Read TWAP ticks at several lookbacks.
 *
 * A V3 pool only retains as many observations as its cardinality allows, and
 * asking beyond that reverts with `OLD`. Windows are therefore probed longest
 * first and the failures are tolerated, so a young pool still yields whatever
 * history it does have instead of failing the whole run.
 */
async function probeOracle(
  client: PublicClient,
  pool: Address,
  spotTick: number
): Promise<{ twaps: Signals["twaps"]; horizon: number }> {
  const twaps: Signals["twaps"] = [];
  let horizon = 0;

  for (const w of WINDOWS) {
    try {
      const res = (await client.readContract({
        address: pool,
        abi: POOL_ABI,
        functionName: "observe",
        args: [[0, w]],
      })) as readonly [readonly bigint[], readonly bigint[]];

      const cumulatives = res[0];
      const tick = Number((cumulatives[0] - cumulatives[1]) / BigInt(w));
      twaps.push({ windowSeconds: w, tick, deviationTicks: spotTick - tick });
      horizon = Math.max(horizon, w);
    } catch {
      // Beyond the oracle's retained history. Expected on young pools.
    }
  }

  return { twaps, horizon };
}
