"use client";

import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { CurtisFactoryAbi } from "@/lib/abis/CurtisFactory";
import { CurtisVaultAbi } from "@/lib/abis/CurtisVault";
import { addresses } from "@/lib/addresses";
import { ACTIVE_CHAIN_ID } from "@/lib/chains";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * Reads are issued individually rather than through `useReadContracts`.
 *
 * Multicall3 is deployed on BOT Chain mainnet and genuinely absent on Bohr
 * testnet, so a batched helper silently returns nothing there and the whole
 * dashboard renders empty. Six separate `eth_call`s against a 0.75s chain cost
 * nothing worth optimising for.
 */

const POLL = { refetchInterval: 12_000 } as const;

/** The caller's vault, or null if they have not created one. */
export function useVaultAddress() {
  const { address } = useAccount();
  const factory = addresses.curtisFactory;

  const { data, isLoading, refetch } = useReadContract({
    abi: CurtisFactoryAbi,
    address: factory ?? undefined,
    functionName: "vaultOf",
    args: address ? [address] : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: Boolean(address && factory) },
  });

  const vault = data && data !== ZERO ? (data as Address) : null;
  return { vault, isLoading, refetch, factoryDeployed: Boolean(factory) };
}

export interface PositionInfo {
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  spotTick: number;
  inRange: boolean;
  hasPosition: boolean;
}

export function usePositionInfo(vault: Address | null) {
  const { data, isLoading, refetch } = useReadContract({
    abi: CurtisVaultAbi,
    address: vault ?? undefined,
    functionName: "positionInfo",
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: Boolean(vault), ...POLL },
  });

  const info: PositionInfo | null = data
    ? {
        tickLower: Number((data as readonly unknown[])[0]),
        tickUpper: Number((data as readonly unknown[])[1]),
        liquidity: (data as readonly unknown[])[2] as bigint,
        spotTick: Number((data as readonly unknown[])[3]),
        inRange: Boolean((data as readonly unknown[])[4]),
        hasPosition: ((data as readonly unknown[])[2] as bigint) > 0n,
      }
    : null;

  return { info, isLoading, refetch };
}

export interface Guardrails {
  minRangeWidth: number;
  maxRangeWidth: number;
  maxRebalancesPerDay: number;
  maxCentreOffset: number;
}

export function useGuardrails(vault: Address | null) {
  const { data, isLoading } = useReadContract({
    abi: CurtisVaultAbi,
    address: vault ?? undefined,
    functionName: "guardrails",
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: Boolean(vault) },
  });

  const guardrails: Guardrails | null = data
    ? {
        minRangeWidth: Number((data as readonly unknown[])[0]),
        maxRangeWidth: Number((data as readonly unknown[])[1]),
        maxRebalancesPerDay: Number((data as readonly unknown[])[2]),
        maxCentreOffset: Number((data as readonly unknown[])[3]),
      }
    : null;

  return { guardrails, isLoading };
}

export function useVaultMeta(vault: Address | null) {
  const enabled = Boolean(vault);
  const common = { abi: CurtisVaultAbi, address: vault ?? undefined, chainId: ACTIVE_CHAIN_ID };

  const paused = useReadContract({
    ...common,
    functionName: "paused",
    query: { enabled, ...POLL },
  });
  const agent = useReadContract({ ...common, functionName: "agent", query: { enabled } });
  const tokenId = useReadContract({
    ...common,
    functionName: "tokenId",
    query: { enabled, ...POLL },
  });
  const remaining = useReadContract({
    ...common,
    functionName: "rebalancesRemainingToday",
    query: { enabled, ...POLL },
  });

  return {
    paused: paused.data as boolean | undefined,
    agent: agent.data as Address | undefined,
    tokenId: tokenId.data as bigint | undefined,
    rebalancesRemaining: remaining.data as bigint | undefined,
    /* The polling interval already keeps these current, but pausing is a control
       the owner presses and then looks at — a twelve-second wait to see whether
       it worked reads as the button having failed. */
    refetch: () => {
      void paused.refetch();
      void tokenId.refetch();
      void remaining.refetch();
    },
  };
}

/** Live pool tick, read directly — works with or without a vault. */
export function usePoolSpot() {
  const { data } = useReadContract({
    abi: [
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
    ] as const,
    address: addresses.pool,
    functionName: "slot0",
    chainId: ACTIVE_CHAIN_ID,
    query: POLL,
  });

  return data ? Number((data as readonly unknown[])[1]) : null;
}
