"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { shortAddress } from "@/components/ui/Address";
import { ACTIVE_CHAIN_ID, activeChain } from "@/lib/chains";

/**
 * Wallet control.
 *
 * Handles the three states that actually occur, rather than only the happy
 * one: no wallet installed, connected to the wrong network, and connected
 * correctly. The wrong-network case matters most — silently transacting on the
 * wrong chain is the worst outcome available, so it blocks with a switch
 * prompt instead of letting the app look functional.
 */
export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: balance } = useBalance({ address, chainId: ACTIVE_CHAIN_ID });

  const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
  const wrongNetwork = isConnected && chainId !== ACTIVE_CHAIN_ID;

  if (!isConnected) {
    return (
      <Button
        variant="primary"
        onClick={() => injected && connect({ connector: injected })}
        loading={isPending}
        disabled={!injected}
      >
        {injected ? "Connect wallet" : "No wallet found"}
      </Button>
    );
  }

  if (wrongNetwork) {
    return (
      <Button
        variant="primary"
        onClick={() => switchChain({ chainId: ACTIVE_CHAIN_ID })}
        loading={switching}
      >
        Switch to {activeChain.name}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {balance && (
        <span className="tabular hidden text-[12px] text-[var(--color-mid)] sm:inline">
          {Number(formatUnits(balance.value, balance.decimals)).toFixed(3)}{" "}
          <span className="text-[var(--color-faint)]">{balance.symbol}</span>
        </span>
      )}
      <Pill tone="inrange" dot pulse>
        {shortAddress(address!)}
      </Pill>
      <Button size="sm" onClick={() => disconnect()}>
        Disconnect
      </Button>
    </div>
  );
}
