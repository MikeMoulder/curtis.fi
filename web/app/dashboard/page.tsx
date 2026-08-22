"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Address } from "@/components/ui/Address";
import { Reveal } from "@/components/ui/Reveal";
import { Curtis, type CurtisState } from "@/components/curtis/Curtis";
import { RangeBand, rangeStatus, TONE } from "@/components/position/RangeBand";
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
  type Guardrails,
} from "@/lib/hooks/useCurtis";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { vault, isLoading, refetch, factoryDeployed } = useVaultAddress();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="sheet w-full grow pt-16 pb-24">
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

  // This was a bare `if (isSuccess) setTimeout(onCreated, 300)` in the render
  // body — a side effect fired on every re-render while the receipt stayed
  // cached, which under React's double-invoked renders queued the refetch more
  // than once. An effect keyed on the flag fires it exactly on the transition.
  useEffect(() => {
    if (!isSuccess) return;
    const t = window.setTimeout(onCreated, 300);
    return () => clearTimeout(t);
  }, [isSuccess, onCreated]);

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
    <div className="mx-auto max-w-[900px]">
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
        {/* Ruled cells sharing their borders, rather than three floating cards.
            The selected one is stated the way a drawing states a selection: a
            heavier border, a filled datum square, and a darker field — none of
            which depend on the translucent white fills the previous version
            used, which were invisible on this film. */}
        <div className="mt-14 grid border border-[var(--hair-2)] sm:grid-cols-3">
          {PRESETS.map((p) => {
            const active = p.id === preset.id;
            return (
              <button
                key={p.id}
                onClick={() => setPreset(p)}
                aria-pressed={active}
                className={`p-5 text-left transition-colors duration-300 not-last:border-b not-last:border-[var(--hair-2)] sm:not-last:border-b-0 sm:not-last:border-r ${
                  active
                    ? "bg-[var(--color-film-3)] shadow-[inset_0_0_0_1px_var(--color-ink)]"
                    : "hover:bg-[var(--color-film-3)]/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="head text-[15px]">{p.name}</span>
                  <span
                    className={`size-2 shrink-0 border transition-colors ${
                      active
                        ? "border-[var(--color-oxide)] bg-[var(--color-oxide)]"
                        : "border-[var(--hair-2)] bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                  {p.summary}
                </div>

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
        <p className="mx-auto mt-8 max-w-[62ch] text-center text-[13.5px] leading-relaxed text-[var(--color-ink-2)]">
          {preset.detail}
        </p>
      </Reveal>

      {error && (
        <div className="mt-8 border-l-2 border-[var(--color-oxide)] bg-[var(--color-oxide-bg)] px-5 py-4">
          <p className="text-[12.5px] leading-relaxed text-[var(--color-oxide)]">
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
            className="meter text-[12px] text-[var(--color-ink-3)] underline decoration-[var(--hair-2)] underline-offset-[3px] hover:text-[var(--color-oxide)]"
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
      <dd className="meter text-[12.5px] text-[var(--color-ink)]">{v}</dd>
    </div>
  );
}

/* ── the vault ────────────────────────────────────────────────────────────── */

/**
 * An operations screen, not a document.
 *
 * The previous version answered "how does this work?" by printing the answer:
 * four titled sections, each opening with a paragraph, and the explanation of
 * the agent's cycle spelled out in full on the page. Correct information,
 * unusable layout — the reader had to read three hundred words to find out
 * whether their position was earning.
 *
 * So the page now states the state first and explains only on request. Four
 * figures across the top answer everything at a glance; the gauge shows where
 * price sits; the cycle strip is one row of five cells with its narrative folded
 * into a disclosure; funds and limits sit side by side at the bottom. The full
 * five-stage account lives on the home page, where a first-time reader is.
 */
function VaultView({ vault }: { vault: `0x${string}` }) {
  const { info, refetch: refetchPosition } = usePositionInfo(vault);
  const { guardrails } = useGuardrails(vault);
  const meta = useVaultMeta(vault);
  const spot = usePoolSpot();

  const spotTick = info?.spotTick ?? spot;
  const hasPosition = info?.hasPosition ?? false;
  const live = hasPosition && info && spotTick !== null ? info : null;

  const status = live && spotTick !== null
    ? rangeStatus(spotTick, live.tickLower, live.tickUpper)
    : null;

  const curtisState: CurtisState = meta.paused
    ? "alert"
    : hasPosition
      ? info!.inRange
        ? "idle"
        : "alert"
      : "scanning";

  const headroom =
    live && spotTick !== null
      ? status === "outrange"
        ? "past it"
        : `${((1 - drift(spotTick, live.tickLower, live.tickUpper)) * 100).toFixed(0)}%`
      : "–";

  return (
    <div>
      {/* ── masthead: who, what state, and the way out to history ────────── */}
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
          <div className="flex items-center gap-5">
            <Curtis size={58} state={curtisState} interactive={false} />
            <div>
              <h1 className="display text-[clamp(26px,3.4vw,40px)]">Your vault</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {meta.paused ? (
                  <Pill tone="drifting" dot>
                    Paused
                  </Pill>
                ) : (
                  <Pill tone="inrange" dot pulse>
                    Active
                  </Pill>
                )}
                <span className="label">USDT / WBOT · {POOL_META.feeLabel}</span>
                <Address value={vault} />
              </div>
            </div>
          </div>

          <Link
            href="/activity"
            className="label group inline-flex items-center gap-2 border border-[var(--hair-2)] px-4 py-2.5 transition-colors hover:border-[var(--color-ink)] hover:!text-[var(--color-ink)]"
          >
            Decision log
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </Reveal>

      {/* ── the state, in four figures ───────────────────────────────────── */}
      <Reveal>
        <dl className="mt-10 grid gap-px border-y border-[var(--color-ink)] bg-[var(--hair-2)] sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            k="WBOT price"
            v={spotTick === null ? "–" : `$${formatPrice(tickToWbotPrice(spotTick))}`}
            note={spotTick === null ? "reading pool" : `tick ${spotTick.toLocaleString()}`}
          />
          <Stat
            k="Band"
            v={live ? widthLabel(live.tickUpper - live.tickLower) : "none"}
            note={
              live
                ? `$${formatPrice(tickToWbotPrice(live.tickUpper))} – $${formatPrice(
                    tickToWbotPrice(live.tickLower)
                  )}`
                : "no position open"
            }
          />
          <Stat
            k="Room before it stops earning"
            v={headroom}
            tone={status ? TONE[status].text : undefined}
            note={live ? "of the distance to the nearer edge" : "opens on the next cycle"}
          />
          <Stat
            k="Moves left today"
            v={meta.rebalancesRemaining?.toString() ?? "–"}
            note={
              guardrails
                ? `of ${guardrails.maxRebalancesPerDay}, rolling 24 hours`
                : "rolling 24 hours"
            }
          />
        </dl>
      </Reveal>

      {/* ── where the price sits ─────────────────────────────────────────── */}
      <Reveal>
        <div className="plate mt-10 px-5 py-6 sm:px-6">
          {live && spotTick !== null ? (
            <RangeBand
              tickLower={live.tickLower}
              tickUpper={live.tickUpper}
              spotTick={spotTick}
            />
          ) : (
            <div className="py-10 text-center">
              <p className="head text-[16px]">No position open</p>
              <p className="mx-auto mt-3 max-w-[44ch] text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                Deposit below, then run a cycle — Curtis opens a range around the
                current price.
              </p>
            </div>
          )}
        </div>
      </Reveal>

      {/* ── the action ───────────────────────────────────────────────────── */}
      <Reveal>
        <div className="mt-10">
          <RunCurtis vault={vault} onActed={refetchPosition} />
        </div>
      </Reveal>

      {/* ── funds and limits, side by side ───────────────────────────────── */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <Reveal>
          <VaultActions vault={vault} onChanged={refetchPosition} />
        </Reveal>
        <Reveal delay={60}>
          <Limits guardrails={guardrails} agent={meta.agent} tokenId={meta.tokenId} />
        </Reveal>
      </div>
    </div>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────────── */

/**
 * One cell of the status strip. The rules between cells are the container's
 * background showing through a 1px grid gap, which is the only way to get a
 * clean lattice at every breakpoint without per-cell border arithmetic.
 */
function Stat({
  k,
  v,
  note,
  tone,
}: {
  k: string;
  v: string;
  note?: string;
  tone?: string;
}) {
  return (
    <div className="bg-[var(--color-film)] px-5 py-4">
      <dt className="label">{k}</dt>
      <dd>
        <div
          className={`meter mt-2.5 text-[clamp(20px,2vw,26px)] leading-none ${
            tone ?? "text-[var(--color-ink)]"
          }`}
        >
          {v}
        </div>
        {note && (
          <div className="mt-2 text-[11.5px] leading-snug text-[var(--color-ink-4)]">{note}</div>
        )}
      </dd>
    </div>
  );
}

/**
 * The bounds, as a spec sheet. Four numbers and the address that is allowed to
 * act inside them — no argument for why they exist, because the home page makes
 * that argument at length and this reader has already accepted it.
 */
function Limits({
  guardrails,
  agent,
  tokenId,
}: {
  guardrails: Guardrails | null;
  agent?: `0x${string}`;
  tokenId?: bigint;
}) {
  return (
    <section className="plate">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-[var(--color-ink)] px-6 py-5">
        <h2 className="head text-[17px]">Limits</h2>
        <span className="label">Enforced in the contract</span>
      </div>

      <div className="px-6 py-2">
        {guardrails ? (
          <>
            <LimitRow k="Narrowest range" v={widthLabel(guardrails.minRangeWidth)} />
            <LimitRow k="Widest range" v={widthLabel(guardrails.maxRangeWidth)} />
            <LimitRow k="Moves per day" v={String(guardrails.maxRebalancesPerDay)} />
            <LimitRow k="Centred within" v={widthLabel(guardrails.maxCentreOffset * 2)} />
          </>
        ) : (
          <div className="py-5 text-[13px] text-[var(--color-ink-3)]">Loading…</div>
        )}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-t border-[var(--hair-2)] px-6 py-4">
        <span className="flex items-baseline gap-2.5">
          <span className="label">Agent</span>
          {agent ? (
            <Address value={agent} />
          ) : (
            <span className="meter text-[12px] text-[var(--color-ink-4)]">–</span>
          )}
        </span>
        <span className="flex items-baseline gap-2.5">
          <span className="label">Position</span>
          <span className="meter text-[12px] text-[var(--color-ink-2)]">
            {tokenId && tokenId > 0n ? `#${tokenId.toString()}` : "–"}
          </span>
        </span>
      </div>
    </section>
  );
}

function LimitRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--hair)] py-3.5 last:border-b-0">
      <span className="text-[13.5px] text-[var(--color-ink-2)]">{k}</span>
      <span className="meter shrink-0 text-[13.5px] text-[var(--color-prussian)]">{v}</span>
    </div>
  );
}
