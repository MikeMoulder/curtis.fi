"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits, erc20Abi, type Address } from "viem";
import { Button } from "@/components/ui/Button";
import { CurtisVaultAbi } from "@/lib/abis/CurtisVault";
import { TOKENS } from "@/lib/addresses";
import { ACTIVE_CHAIN_ID, explorerTx } from "@/lib/chains";

type TokenKey = "usdt" | "wbot";

/**
 * Moving funds in and out.
 *
 * Deposits need an ERC-20 approval first, so the button states itself as
 * "Approve USDT" until the allowance covers the amount, then becomes "Deposit".
 * Presenting both as one action and silently firing two wallet prompts is the
 * single most common way this flow confuses people.
 */
export function VaultActions({ vault, onChanged }: { vault: Address; onChanged: () => void }) {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");

  return (
    <div className="glass rounded-3xl p-7">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Funds</div>
          <h2 className="mt-2.5 text-[16px] font-medium">
            {tab === "deposit" ? "Add to your vault" : "Take everything out"}
          </h2>
        </div>
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
          {(["deposit", "withdraw"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] capitalize transition-colors ${
                tab === t
                  ? "bg-[var(--color-ink)] text-[var(--color-void)]"
                  : "text-[var(--color-lo)] hover:text-[var(--color-ink)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="rule my-6" />

      {tab === "deposit" ? (
        <DepositForm vault={vault} onChanged={onChanged} />
      ) : (
        <WithdrawForm vault={vault} onChanged={onChanged} />
      )}
    </div>
  );
}

/* ── deposit ──────────────────────────────────────────────────────────────── */

function DepositForm({ vault, onChanged }: { vault: Address; onChanged: () => void }) {
  const { address } = useAccount();
  const [amounts, setAmounts] = useState<Record<TokenKey, string>>({ usdt: "", wbot: "" });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isSuccess) {
    setTimeout(() => {
      onChanged();
      reset();
    }, 400);
  }

  const parsed = (k: TokenKey) => {
    try {
      const v = amounts[k].trim();
      return v ? parseUnits(v, TOKENS[k].decimals) : 0n;
    } catch {
      return 0n;
    }
  };

  const usdtAmount = parsed("usdt");
  const wbotAmount = parsed("wbot");
  const total = usdtAmount + wbotAmount;

  // Only one allowance is checked at a time: whichever token still needs one.
  const needing: TokenKey | null =
    usdtAmount > 0n ? "usdt" : wbotAmount > 0n ? "wbot" : null;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20Abi,
    address: needing ? TOKENS[needing].address : undefined,
    functionName: "allowance",
    args: address && needing ? [address, vault] : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: Boolean(address && needing) },
  });

  const needed = needing === "usdt" ? usdtAmount : needing === "wbot" ? wbotAmount : 0n;
  const approved = (allowance as bigint | undefined) ?? 0n;
  const needsApproval = needing !== null && approved < needed;

  const busy = isPending || confirming;

  const approve = () => {
    if (!needing) return;
    writeContract({
      abi: erc20Abi,
      address: TOKENS[needing].address,
      functionName: "approve",
      args: [vault, needed],
      chainId: ACTIVE_CHAIN_ID,
    });
    setTimeout(refetchAllowance, 3000);
  };

  const deposit = () => {
    writeContract({
      abi: CurtisVaultAbi,
      address: vault,
      functionName: "deposit",
      args: [usdtAmount, wbotAmount],
      chainId: ACTIVE_CHAIN_ID,
    });
  };

  return (
    <div className="space-y-4">
      {(["usdt", "wbot"] as const).map((k) => (
        <TokenInput
          key={k}
          tokenKey={k}
          value={amounts[k]}
          onChange={(v) => setAmounts((a) => ({ ...a, [k]: v }))}
          owner={address}
        />
      ))}

      {error && (
        <p className="text-[12px] leading-relaxed text-[var(--color-bad)]">
          {error.message.split("\n")[0].slice(0, 160)}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="primary"
          onClick={needsApproval ? approve : deposit}
          loading={busy}
          disabled={total === 0n}
        >
          {busy
            ? confirming
              ? "Confirming"
              : "Check your wallet"
            : needsApproval
              ? `Approve ${TOKENS[needing!].symbol}`
              : "Deposit"}
        </Button>
        {hash && (
          <a
            href={explorerTx(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="tabular text-[12px] text-[var(--color-lo)] underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
          >
            View transaction
          </a>
        )}
      </div>

      <p className="text-[11.5px] leading-relaxed text-[var(--color-faint)]">
        Deposited funds sit idle in your vault until Curtis opens a position with
        them. You can withdraw at any time, including while he is paused.
      </p>
    </div>
  );
}

function TokenInput({
  tokenKey,
  value,
  onChange,
  owner,
}: {
  tokenKey: TokenKey;
  value: string;
  onChange: (v: string) => void;
  owner: Address | undefined;
}) {
  const token = TOKENS[tokenKey];

  const { data: balance } = useReadContract({
    abi: erc20Abi,
    address: token.address,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: Boolean(owner) },
  });

  const bal = (balance as bigint | undefined) ?? 0n;
  const formatted = formatUnits(bal, token.decimals);

  return (
    <div className="glass-quiet rounded-2xl px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="label">{token.symbol}</span>
        <button
          onClick={() => onChange(formatted)}
          className="tabular text-[11.5px] text-[var(--color-faint)] transition-colors hover:text-[var(--color-accent)]"
        >
          balance {Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </button>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder="0.0"
        inputMode="decimal"
        className="tabular mt-2 w-full bg-transparent text-[22px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-faint)]"
      />
    </div>
  );
}

/* ── withdraw ─────────────────────────────────────────────────────────────── */

function WithdrawForm({ vault, onChanged }: { vault: Address; onChanged: () => void }) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isSuccess) {
    setTimeout(() => {
      onChanged();
      reset();
    }, 400);
  }

  const busy = isPending || confirming;

  const withdraw = () => {
    writeContract({
      abi: CurtisVaultAbi,
      address: vault,
      functionName: "withdrawAll",
      // Minimums of zero: this is the owner's own escape hatch and must never
      // fail on a slippage bound. The contract exits the position and returns
      // whatever it holds.
      args: [0n, 0n],
      chainId: ACTIVE_CHAIN_ID,
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-[13.5px] leading-relaxed text-[var(--color-mid)]">
        This closes any open position, collects the fees it earned, and sends
        every token back to your wallet. It works even while Curtis is paused.
      </p>

      {error && (
        <p className="text-[12px] leading-relaxed text-[var(--color-bad)]">
          {error.message.split("\n")[0].slice(0, 160)}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button variant="danger" onClick={withdraw} loading={busy}>
          {busy ? (confirming ? "Confirming" : "Check your wallet") : "Withdraw everything"}
        </Button>
        {hash && (
          <a
            href={explorerTx(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="tabular text-[12px] text-[var(--color-lo)] underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
          >
            View transaction
          </a>
        )}
      </div>
    </div>
  );
}

