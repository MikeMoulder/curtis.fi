"use client";

import { useEffect, useState } from "react";
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
import { useVaultMeta } from "@/lib/hooks/useCurtis";

type TokenKey = "usdt" | "wbot";

/**
 * The three things only the owner can do.
 *
 * Deposit and withdraw were here already. Pause was not — even though the page
 * states twice that Curtis can be paused and that withdrawal survives it, which
 * is a promise with no button behind it. It is the owner's kill switch, so it
 * belongs on the owner's panel.
 *
 * Deposits need an ERC-20 approval first, so the button states itself as
 * "Approve USDT" until the allowance covers the amount, then becomes "Deposit".
 * Presenting both as one action and silently firing two wallet prompts is the
 * single most common way this flow confuses people.
 */
export function VaultActions({ vault, onChanged }: { vault: Address; onChanged: () => void }) {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");

  return (
    <div className="plate">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b border-[var(--color-ink)] px-6 py-5">
        <div>
          <div className="label">Funds</div>
          <h2 className="head mt-2 text-[17px]">
            {tab === "deposit" ? "Add to your vault" : "Take everything out"}
          </h2>
        </div>

        {/* Two ruled tabs, not a rounded segmented control. The selected one is
            filled ink — the same figure/ground inversion the sheet uses
            everywhere else to mean "this one". */}
        <div className="flex border border-[var(--hair-2)]">
          {(["deposit", "withdraw"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`label px-4 py-2.5 transition-colors ${
                tab === t
                  ? "bg-[var(--color-ink)] !text-[var(--color-film)]"
                  : "hover:!text-[var(--color-ink)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-6">
        {tab === "deposit" ? (
          <DepositForm vault={vault} onChanged={onChanged} />
        ) : (
          <WithdrawForm vault={vault} onChanged={onChanged} />
        )}
      </div>

      <PauseRow vault={vault} />
    </div>
  );
}

/* ── pause ────────────────────────────────────────────────────────────────── */

function PauseRow({ vault }: { vault: Address }) {
  const meta = useVaultMeta(vault);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) meta.refetch();
    // meta.refetch is a fresh closure each render; keying on the receipt is what
    // makes this fire once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const paused = meta.paused ?? false;
  const busy = isPending || confirming;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-[var(--hair-2)] px-6 py-5">
      <div className="min-w-0">
        <div className="label">{paused ? "Paused" : "Running"}</div>
        <p className="mt-2 max-w-[58ch] text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
          {paused
            ? "Curtis cannot re-range or compound while paused. Your withdrawal still works."
            : "Pausing stops Curtis immediately and permanently until you resume. It cannot stop you withdrawing."}
        </p>
        {error && (
          <p className="mt-2 text-[12px] text-[var(--color-oxide)]">
            {error.message.split("\n")[0].slice(0, 160)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant={paused ? "primary" : "danger"}
          size="sm"
          loading={busy}
          onClick={() =>
            writeContract({
              abi: CurtisVaultAbi,
              address: vault,
              functionName: "setPaused",
              args: [!paused],
              chainId: ACTIVE_CHAIN_ID,
            })
          }
        >
          {busy ? "Confirming" : paused ? "Resume Curtis" : "Pause Curtis"}
        </Button>
        {hash && <TxLink hash={hash} />}
      </div>
    </div>
  );
}

/* ── deposit ──────────────────────────────────────────────────────────────── */

function DepositForm({ vault, onChanged }: { vault: Address; onChanged: () => void }) {
  const { address } = useAccount();
  const [amounts, setAmounts] = useState<Record<TokenKey, string>>({ usdt: "", wbot: "" });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Was a bare setTimeout in the render body, which re-queued on every render
  // while the receipt stayed cached.
  useEffect(() => {
    if (!isSuccess) return;
    const t = window.setTimeout(() => {
      onChanged();
      reset();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

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
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["usdt", "wbot"] as const).map((k) => (
          <TokenInput
            key={k}
            tokenKey={k}
            value={amounts[k]}
            onChange={(v) => setAmounts((a) => ({ ...a, [k]: v }))}
            owner={address}
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 border-l-2 border-[var(--color-oxide)] pl-3 text-[12px] leading-relaxed text-[var(--color-oxide)]">
          {error.message.split("\n")[0].slice(0, 160)}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
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
        {hash && <TxLink hash={hash} />}
      </div>

      <p className="mt-5 max-w-[68ch] text-[11.5px] leading-relaxed text-[var(--color-ink-4)]">
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
    <div className="border border-[var(--hair-2)] bg-[var(--color-film)] px-4 py-3.5 focus-within:border-[var(--color-ink)]">
      <div className="flex items-center justify-between gap-3">
        <span className="label">{token.symbol}</span>
        <button
          onClick={() => onChange(formatted)}
          className="meter text-[11.5px] text-[var(--color-ink-4)] transition-colors hover:text-[var(--color-oxide)]"
        >
          balance {Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </button>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder="0.0"
        inputMode="decimal"
        className="meter mt-2 w-full bg-transparent text-[22px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-4)]"
      />
    </div>
  );
}

/* ── withdraw ─────────────────────────────────────────────────────────────── */

function WithdrawForm({ vault, onChanged }: { vault: Address; onChanged: () => void }) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    const t = window.setTimeout(() => {
      onChanged();
      reset();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

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
    <div>
      <p className="max-w-[68ch] text-[13.5px] leading-relaxed text-[var(--color-ink-2)]">
        This closes any open position, collects the fees it earned, and sends
        every token back to your wallet. It works even while Curtis is paused.
      </p>

      {error && (
        <p className="mt-4 border-l-2 border-[var(--color-oxide)] pl-3 text-[12px] leading-relaxed text-[var(--color-oxide)]">
          {error.message.split("\n")[0].slice(0, 160)}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button variant="danger" onClick={withdraw} loading={busy}>
          {busy ? (confirming ? "Confirming" : "Check your wallet") : "Withdraw everything"}
        </Button>
        {hash && <TxLink hash={hash} />}
      </div>
    </div>
  );
}

function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={explorerTx(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="meter text-[12px] text-[var(--color-prussian)] underline decoration-[var(--hair-2)] underline-offset-[3px] transition-colors hover:text-[var(--color-oxide)] hover:decoration-[var(--color-oxide)]"
    >
      View transaction
    </a>
  );
}
