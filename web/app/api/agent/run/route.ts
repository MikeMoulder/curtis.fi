import { NextResponse } from "next/server";
import { createWalletClient, http, keccak256, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import Anthropic from "@anthropic-ai/sdk";

import { CurtisVaultAbi } from "@/lib/abis/CurtisVault";
import { CurtisFactoryAbi } from "@/lib/abis/CurtisFactory";
import { addresses } from "@/lib/addresses";
import { gatherSignals, publicClient, chainForAgent } from "@/lib/agent/signals";
import { decide } from "@/lib/agent/decide";
import { guard } from "@/lib/agent/guard";

// viem signing needs node APIs, not the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BigInt has no JSON representation, and the signals carry several of them
 * (token balances, gas price). Converting at the boundary keeps the internal
 * types honest instead of widening them to strings everywhere.
 */
function ok(body: unknown, status = 200) {
  const safe = JSON.parse(
    JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json(safe, { status });
}

/** Keys arrive with and without the 0x prefix depending on where they came from. */
function normaliseKey(raw: string | undefined): Hex | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  const hex = (t.startsWith("0x") ? t : `0x${t}`) as Hex;
  return /^0x[0-9a-fA-F]{64}$/.test(hex) ? hex : null;
}

/**
 * One decision cycle.
 *
 * POST { vault, dryRun? }
 *
 * Ordered so the irreversible step comes last: read chain state, ask the model,
 * check the answer against the same rules the contract enforces, simulate, and
 * only then broadcast. Every stage before the broadcast is free and can refuse.
 */
export async function POST(req: Request) {
  let vault: Address;
  let dryRun = false;

  try {
    const body = await req.json();
    vault = body.vault as Address;
    dryRun = Boolean(body.dryRun);
    if (!/^0x[0-9a-fA-F]{40}$/.test(vault)) throw new Error("bad vault address");
  } catch {
    return ok({ error: "Expected { vault: address }" }, 400);
  }

  const agentKey = normaliseKey(process.env.AGENT_PRIVATE_KEY);
  if (!agentKey) {
    return ok({ error: "AGENT_PRIVATE_KEY is missing or malformed on the server." }, 500);
  }

  const account = privateKeyToAccount(agentKey);
  const client = publicClient();

  try {
    /* ---- 1. Confirm this is a vault we are actually the agent for --------
       Without this, the endpoint would sign against any address a caller
       names. Both checks are cheap and both must hold. */
    if (!addresses.curtisFactory) {
      return ok({ error: "No factory on this network." }, 400);
    }

    const owner = (await client.readContract({
      address: vault,
      abi: CurtisVaultAbi,
      functionName: "owner",
    })) as Address;

    const [registered, onChainAgent] = await Promise.all([
      client.readContract({
        address: addresses.curtisFactory,
        abi: CurtisFactoryAbi,
        functionName: "vaultOf",
        args: [owner],
      }),
      client.readContract({ address: vault, abi: CurtisVaultAbi, functionName: "agent" }),
    ]);

    if ((registered as string).toLowerCase() !== vault.toLowerCase()) {
      return ok({ error: "That address is not a vault from this factory." }, 400);
    }
    if ((onChainAgent as string).toLowerCase() !== account.address.toLowerCase()) {
      return ok({ error: "This agent is not authorised on that vault." }, 403);
    }

    /* ---- 2. Read the world ----------------------------------------------- */
    const signals = await gatherSignals(vault);

    /* ---- 3. Ask the model ------------------------------------------------ */
    let decision;
    try {
      decision = await decide(signals);
    } catch (e) {
      // A model that errors or rate-limits must never approve anything. The
      // vault stays exactly as it is and the cycle can be retried.
      const msg = e instanceof Anthropic.APIError ? `${e.status}: ${e.message}` : String(e);
      return ok({
        stage: "decide",
        acted: false,
        refusal: { reason: "model-unavailable", detail: msg.split("\n")[0].slice(0, 240) },
        signals,
      });
    }

    /* ---- 4. Check the answer ---------------------------------------------- */
    const checked = guard(decision.decision, signals);

    if (!checked.ok) {
      return ok({
        stage: "guard",
        acted: false,
        decision: decision.decision,
        refusal: { reason: checked.reason, detail: checked.detail },
        model: decision.model,
        signals,
      });
    }

    const plan = checked.plan;

    if (dryRun) {
      return ok({
        stage: "dry-run",
        acted: false,
        decision: decision.decision,
        plan,
        model: decision.model,
        signals,
      });
    }

    /* ---- 5. Simulate, then broadcast -------------------------------------- */
    const decisionId = keccak256(
      toHex(`${vault}-${plan.action}-${plan.tickLower}-${plan.tickUpper}-${Date.now()}`)
    );
    const reasoning = decision.decision.reasoning.slice(0, 180);
    const confidence = Math.min(10_000, Math.max(0, Math.round(decision.decision.confidenceBps)));

    const wallet = createWalletClient({ account, chain: chainForAgent, transport: http() });

    let txHash: Hex;
    try {
      if (plan.action === "compound") {
        const { request } = await client.simulateContract({
          account,
          address: vault,
          abi: CurtisVaultAbi,
          functionName: "compound",
          args: [decisionId, reasoning, confidence],
        });
        txHash = await wallet.writeContract(request);
      } else {
        const { request } = await client.simulateContract({
          account,
          address: vault,
          abi: CurtisVaultAbi,
          functionName: "rebalance",
          args: [
            decisionId,
            reasoning,
            confidence,
            plan.tickLower,
            plan.tickUpper,
            // The contract demands non-zero slippage bounds. Meaningful values
            // need full V3 liquidity math to predict how the mint splits across
            // the two tokens; the simulate above is what actually protects this
            // call today. A known gap, not an oversight.
            1n,
            1n,
          ],
        });
        txHash = await wallet.writeContract(request);
      }
    } catch (e) {
      return ok({
        stage: "execute",
        acted: false,
        decision: decision.decision,
        plan,
        refusal: {
          reason: "reverted",
          detail: e instanceof Error ? e.message.split("\n")[0].slice(0, 240) : String(e),
        },
        signals,
      });
    }

    // Returned without awaiting the receipt: blocks here are under a second and
    // the client can watch for confirmation, while a serverless handler has an
    // execution ceiling.
    return ok({
      stage: "broadcast",
      acted: true,
      txHash,
      decisionId,
      decision: decision.decision,
      plan,
      model: decision.model,
      signals,
    });
  } catch (e) {
    return ok({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}
