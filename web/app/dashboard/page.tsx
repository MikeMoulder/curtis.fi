"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Address } from "@/components/ui/Address";
import { Reveal } from "@/components/ui/Reveal";
import { Curtis, CURTIS_STATUS, type CurtisState } from "@/components/curtis/Curtis";
import { RangeBand } from "@/components/position/RangeBand";
import { RunCurtis } from "@/components/agent/RunCurtis";
import { VaultActions } from "@/components/vault/VaultActions";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { CurtisFactoryAbi } from "@/lib/abis/CurtisFactory";
import { addresses, POOL_META } from "@/lib/addresses";
import { ACTIVE_CHAIN_ID, explorerTx } from "@/lib/chains";
import { PRESETS, DEFAULT_PRESET, widthLabel, type GuardrailPreset } from "@/lib/presets";
import { tickToWbotPrice, formatPrice, drift } from "@/lib/ticks";
import {
  useVaultAddress,
  usePositionInfo,
  useGuardrails,
  useVaultMeta,
  usePoolSpot,
} from "@/lib/hooks/useCurtis";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { vault, isLoading, refetch, factoryDeployed } = useVaultAddress();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto max-w-[1240px] px-6 pt-32 pb-24 w-full">
        {!isConnected ? (
          <Gate
            title="Connect to begin"
            body="Curtis manages a position held in a vault only you can withdraw from. Connect a wallet to create one."
            state="idle"
          >
            <ConnectButton />
          </Gate>
        ) : !factoryDeployed ? (
          <Gate
            title="Not on this network"
            body="Curtis has no factory on the chain you are connected to. Switch networks to continue."
            state="alert"
          />
        ) : isLoading ? (
          <Gate title="Looking for your vault" body="Reading the factory…" state="scanning" />
        ) : !vault ? (
          <CreateVault onCreated={refetch} />
        ) : (
          <VaultView vault={vault} />
        )}
      </main>
      <Footer />
    </div>
  );
}

/* ── shared empty/gate state ──────────────────────────────────────────────── */

function Gate({
  title,
  body,
  state,
  children,
}: {
  title: string;
  body: string;
  state: CurtisState;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
      <Curtis size={130} state={state} />
      <h1 className="display mt-14 text-[clamp(30px,4vw,46px)]">{title}</h1>
      <p className="lead mt-5 max-w-[400px]">{body}</p>
      {children && <div className="mt-9">{children}</div>}
    </div>
  );
}

/* ── create ───────────────────────────────────────────────────────────────── */

function CreateVault({ onCreated }: { onCreated: () => void }) {
  const [preset, setPreset] = useState<GuardrailPreset>(DEFAULT_PRESET);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isSuccess) setTimeout(onCreated, 300);

  const busy = isPending || confirming;

  const create = () => {
    if (!addresses.curtisFactory) return;
    writeContract({
      abi: CurtisFactoryAbi,
      address: addresses.curtisFactory,
      functionName: "createVault",
      args: [
        {
          minRangeWidth: preset.minRangeWidth,
          maxRangeWidth: preset.maxRangeWidth,
          maxRebalancesPerDay: preset.maxRebalancesPerDay,
          maxCentreOffset: preset.maxCentreOffset,
        },
      ],
      chainId: ACTIVE_CHAIN_ID,
    });
  };

  return (
    <div className="mx-auto max-w-[880px]">
      <Reveal className="flex flex-col items-center text-center">
        <Curtis size={116} state={busy ? "acting" : "idle"} />
        <div className="label mt-12">Step one</div>
        <h1 className="display mt-5 text-[clamp(32px,4.6vw,54px)]">
          Set the limits he
          <span className="display-em"> works inside.</span>
        </h1>
        <p className="lead mt-6 max-w-[440px]">
          These bound what Curtis may do, not what he will do. He chooses the range
          within them; your vault rejects anything outside. All of it is changeable
          later.
        </p>
      </Reveal>

      <Reveal delay={100}>
        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {PRESETS.map((p) => {
            const active = p.id === preset.id;
            return (
              <button
                key={p.id}
                onClick={() => setPreset(p)}
                className={`rounded-2xl border p-5 text-left transition-all duration-300 ${
                  active
                    ? "border-white/25 bg-white/[0.07] shadow-[0_18px_50px_-24px_rgba(255,255,255,0.35)]"
                    : "glass-quiet hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium">{p.name}</span>
                  <span
                    className={`size-1.5 rounded-full transition-colors ${
                      active ? "bg-[var(--color-ink)]" : "bg-transparent"
                    }`}
                  />
                </div>
                <div className="mt-1.5 text-[12.5px] text-[var(--color-lo)]">{p.summary}</div>

                <div className="rule my-4" />

                <dl className="space-y-2">
                  <SpecRow k="Narrowest" v={widthLabel(p.minRangeWidth)} />
                  <SpecRow k="Widest" v={widthLabel(p.maxRangeWidth)} />
                  <SpecRow k="Moves / day" v={`≤ ${p.maxRebalancesPerDay}`} />
                </dl>
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={160}>
        <p className="mt-8 text-center text-[13.5px] leading-relaxed text-[var(--color-mid)]">
          {preset.detail}
        </p>
      </Reveal>

      {error && (
        <div className="mt-8 rounded-2xl border border-[var(--color-bad)]/25 bg-[var(--color-bad)]/[0.06] px-5 py-4">
          <p className="text-[12.5px] leading-relaxed text-[var(--color-bad)]">
            {error.message.split("\n")[0]}
          </p>
        </div>
      )}

      <div className="mt-11 flex flex-col items-center gap-4">
        <Button variant="primary" size="lg" onClick={create} loading={busy}>
          {confirming ? "Confirming…" : isPending ? "Check your wallet" : "Create vault"}
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

function SpecRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="label">{k}</dt>
      <dd className="tabular text-[12.5px] text-[var(--color-ink)]">{v}</dd>
    </div>
  );
}

/* ── the vault ────────────────────────────────────────────────────────────── */

function VaultView({ vault }: { vault: `0x${string}` }) {
  const { info, refetch: refetchPosition } = usePositionInfo(vault);
  const { guardrails } = useGuardrails(vault);
  const meta = useVaultMeta(vault);
  const spot = usePoolSpot();

  const spotTick = info?.spotTick ?? spot;
  const hasPosition = info?.hasPosition ?? false;

  const curtisState: CurtisState = meta.paused
    ? "alert"
    : hasPosition
      ? info!.inRange
        ? "idle"
        : "alert"
      : "scanning";

  return (
    <div>
      {/* ── masthead ── */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="flex items-center gap-6">
            <Curtis size={72} state={curtisState} interactive={false} />
            <div>
              <div className="label">
                {meta.paused ? "Paused by you" : CURTIS_STATUS[curtisState]}
              </div>
              <h1 className="display mt-3 text-[clamp(30px,4vw,48px)]">Your vault</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
            <Meta label="Vault">
              <Address value={vault} />
            </Meta>
            <Meta label="Agent">
              {meta.agent ? <Address value={meta.agent} /> : <span>–</span>}
            </Meta>
            <Meta label="Status">
              {meta.paused ? (
                <Pill tone="drifting" dot>
                  Paused
                </Pill>
              ) : (
                <Pill tone="inrange" dot pulse>
                  Active
                </Pill>
              )}
            </Meta>
          </div>
        </div>
      </Reveal>

      <div className="rule-fade my-10" />

      <Reveal>
        <RunCurtis vault={vault} onActed={refetchPosition} />
      </Reveal>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* ── position ── */}
        <Reveal>
          <div className="glass h-full rounded-3xl p-7">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="label">Position</div>
                <h2 className="mt-2.5 text-[16px] font-medium">
                  USDT / WBOT
                  <span className="ml-2 text-[var(--color-lo)]">{POOL_META.feeLabel}</span>
                </h2>
              </div>
              {meta.tokenId && meta.tokenId > 0n && (
                <span className="tabular text-[11.5px] text-[var(--color-faint)]">
                  NFT #{meta.tokenId.toString()}
                </span>
              )}
            </div>

            <div className="mt-8">
              {hasPosition && info && spotTick !== null ? (
                <>
                  <RangeBand
                    tickLower={info.tickLower}
                    tickUpper={info.tickUpper}
                    spotTick={spotTick}
                  />

                  <div className="rule my-8" />

                  <div className="grid grid-cols-3 gap-6">
                    <Figure
                      label="Band width"
                      value={widthLabel(info.tickUpper - info.tickLower)}
                    />
                    <Figure
                      label="Drift to edge"
                      value={`${(drift(spotTick, info.tickLower, info.tickUpper) * 100).toFixed(0)}%`}
                      warn={drift(spotTick, info.tickLower, info.tickUpper) > 0.7}
                    />
                    <Figure
                      label="Moves left"
                      value={meta.rebalancesRemaining?.toString() ?? "–"}
                    />
                  </div>
                </>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-[15px] text-[var(--color-ink)]">No position open</p>
                  <p className="mx-auto mt-3 max-w-[340px] text-[13.5px] leading-relaxed text-[var(--color-lo)]">
                    Deposit USDT or WBOT and Curtis will open a range on his next pass.
                  </p>
                  {spotTick !== null && (
                    <p className="tabular mt-7 text-[12px] text-[var(--color-faint)]">
                      WBOT ${formatPrice(tickToWbotPrice(spotTick))} · tick{" "}
                      {spotTick.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* ── limits ── */}
        <Reveal delay={80}>
          <div className="glass h-full rounded-3xl p-7">
            <div className="label">Limits</div>
            <h2 className="mt-2.5 text-[16px] font-medium">Enforced by the vault</h2>

            <div className="mt-7 space-y-5">
              {guardrails ? (
                <>
                  <LimitRow
                    k="Narrowest range"
                    v={widthLabel(guardrails.minRangeWidth)}
                    why="Stops concentration becoming churn"
                  />
                  <LimitRow
                    k="Widest range"
                    v={widthLabel(guardrails.maxRangeWidth)}
                    why="Stops full-width passing as management"
                  />
                  <LimitRow
                    k="Moves per day"
                    v={String(guardrails.maxRebalancesPerDay)}
                    why="Caps gas burn"
                  />
                  <LimitRow
                    k="Centred within"
                    v={widthLabel(guardrails.maxCentreOffset * 2)}
                    why="Ranges must track price"
                  />

                  <div className="rule !mt-7" />

                  <p className="text-[12px] leading-relaxed text-[var(--color-faint)]">
                    Curtis holds two powers, re-range and compound, and neither can
                    move a token out of this vault. Only you can withdraw, and
                    withdrawal works even while paused.
                  </p>
                </>
              ) : (
                <div className="text-[13px] text-[var(--color-lo)]">Loading…</div>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={120}>
        <div className="mt-5">
          <VaultActions vault={vault} onChanged={refetchPosition} />
        </div>
      </Reveal>
    </div>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────────── */

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Figure({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div
        className={`tabular mt-2.5 text-[22px] leading-none font-medium ${
          warn ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function LimitRow({ k, v, why }: { k: string; v: string; why: string }) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0">
        <div className="text-[13.5px] text-[var(--color-ink)]">{k}</div>
        <div className="mt-0.5 text-[11.5px] text-[var(--color-faint)]">{why}</div>
      </div>
      <div className="tabular shrink-0 text-[13.5px] text-[var(--color-accent)]">{v}</div>
    </div>
  );
}
