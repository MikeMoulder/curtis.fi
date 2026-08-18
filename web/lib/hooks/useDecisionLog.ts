"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem, type Address } from "viem";
import { ACTIVE_CHAIN_ID } from "@/lib/chains";

export interface Decision {
  decisionId: string;
  action: string;
  reasoning: string;
  confidenceBps: number;
  tickLower: number;
  tickUpper: number;
  amount0: bigint;
  amount1: bigint;
  timestamp: number;
  txHash: string;
  blockNumber: bigint;
}

const CURTIS_ACTED = parseAbiItem(
  "event CurtisActed(bytes32 indexed decisionId, string action, string reasoning, uint16 confidenceBps, int24 tickLower, int24 tickUpper, uint256 amount0, uint256 amount1, uint256 timestamp)"
);

/**
 * Curtis's decision history, read straight from chain logs.
 *
 * Deliberately not served from a database. The point of the log is that anyone
 * can verify it against an explorer nobody involved controls — routing it
 * through our own API would make it exactly as trustworthy as our word.
 *
 * The lookback is windowed because some RPCs cap `eth_getLogs` ranges, and a
 * failure here must degrade to an empty list rather than break the page.
 */
export function useDecisionLog(vault: Address | null, lookbackBlocks = 200_000n) {
  const client = usePublicClient({ chainId: ACTIVE_CHAIN_ID });
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vault || !client) {
      setDecisions([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const head = await client.getBlockNumber();
        const from = head > lookbackBlocks ? head - lookbackBlocks : 0n;

        const logs = await client.getLogs({
          address: vault,
          event: CURTIS_ACTED,
          fromBlock: from,
          toBlock: head,
        });

        if (cancelled) return;

        const parsed: Decision[] = logs
          .map((l) => ({
            decisionId: (l.args.decisionId ?? "0x") as string,
            action: (l.args.action ?? "") as string,
            reasoning: (l.args.reasoning ?? "") as string,
            confidenceBps: Number(l.args.confidenceBps ?? 0),
            tickLower: Number(l.args.tickLower ?? 0),
            tickUpper: Number(l.args.tickUpper ?? 0),
            amount0: (l.args.amount0 ?? 0n) as bigint,
            amount1: (l.args.amount1 ?? 0n) as bigint,
            timestamp: Number(l.args.timestamp ?? 0),
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
          }))
          .sort((a, b) => b.timestamp - a.timestamp);

        setDecisions(parsed);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not read the decision log");
          setDecisions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vault, client, lookbackBlocks]);

  return { decisions, loading, error };
}
