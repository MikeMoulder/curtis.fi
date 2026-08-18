"use client";

import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Address as AddressLink } from "@/components/ui/Address";
import { Curtis, type CurtisState } from "@/components/curtis/Curtis";

interface RunResult {
  stage: "decide" | "guard" | "dry-run" | "execute" | "broadcast";
  acted: boolean;
  txHash?: string;
  model?: string;
  decision?: {
    action: string;
    targetHalfWidthPct: number;
    confidenceBps: number;
    reasoning: string;
  };
  plan?: {
    action: string;
    tickLower: number;
    tickUpper: number;
    effectiveHalfWidthPct: number;
    requestedHalfWidthPct: number;
    clamped: boolean;
  };
  refusal?: { reason: string; detail: string };
  error?: string;
  signals?: {
    spotTick: number;
    observedDriftPct: number;
    oracleHorizonSeconds: number;
    rebalancesRemaining: number;
    position: { exists: boolean; inRange: boolean; driftFraction: number };
    idle: { hasFunds: boolean };
    gas: { rebalanceCostBot: number };
  };
}

/**
 * Runs one decision cycle and shows what happened.
 *
 * The stage animation is not decoration: the server genuinely performs read,
 * decide, then execute in that order, and the pill walks the same sequence
 * while the request is in flight. When the answer lands, it settles on the real
 * outcome, which is frequently a refusal. Refusals are shown as prominently as
 * successes, because an agent that only reports its wins is not an audit trail.
 */
export function RunCurtis({ vault, onActed }: { vault: Address; onActed: () => void }) {
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<"reading" | "deciding" | "executing" | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setStage("reading");

    timers.current.push(window.setTimeout(() => setStage("deciding"), 900));
    timers.current.push(window.setTimeout(() => setStage("executing"), 4500));

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault, dryRun }),
      });
      const json = (await res.json()) as RunResult;
      setResult(json);
      if (json.acted) setTimeout(onActed, 1200);
    } catch (e) {
      setResult({
        stage: "decide",
        acted: false,
        error: e instanceof Error ? e.message : "Request failed",
      });
    } finally {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setRunning(false);
      setStage(null);
    }
  };

  const curtisState: CurtisState = running
    ? stage === "reading"
      ? "scanning"
      : stage === "deciding"
        ? "thinking"
        : "acting"
    : result?.acted
      ? "success"
      : result?.refusal || result?.error
        ? "alert"
        : "idle";

  return (
    <div className="glass rounded-3xl p-7">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-5">
          <Curtis size={56} state={curtisState} interactive={false} />
          <div>
            <div className="label">Agent</div>
            <h2 className="mt-2 text-[16px] font-medium">
              {running
                ? stage === "reading"
                  ? "Reading pool state"
                  : stage === "deciding"
                    ? "Weighing the range"
                    : "Signing and broadcasting"
                : "Run a decision cycle"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--color-lo)]">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="size-3.5 accent-[var(--color-accent)]"
            />
            Decide only
          </label>
          <Button variant="primary" onClick={run} loading={running}>
            {running ? "Working" : "Run Curtis"}
          </Button>
        </div>
      </div>

      {!result && !running && (
        <p className="mt-6 text-[12.5px] leading-relaxed text-[var(--color-faint)]">
          Curtis reads the pool, judges whether the position needs moving, and
          acts only if it does. &ldquo;Decide only&rdquo; runs everything except the
          transaction.
        </p>
      )}

      {result && <Outcome result={result} />}
    </div>
  );
}

function Outcome({ result }: { result: RunResult }) {
  const s = result.signals;

  return (
    <div className="mt-7">
      <div className="rule mb-6" />

      <div className="flex flex-wrap items-center gap-3">
        {result.acted ? (
          <Pill tone="inrange" dot>
            Acted
          </Pill>
        ) : (
          <Pill tone={result.error ? "outrange" : "drifting"} dot>
            {result.stage === "dry-run" ? "Decided, not sent" : "Held"}
          </Pill>
        )}
        {result.decision && (
          <span className="tabular text-[12px] text-[var(--color-lo)]">
            {result.decision.action} · {(result.decision.confidenceBps / 100).toFixed(0)}% confident
          </span>
        )}
        {result.model && (
          <span className="tabular ml-auto text-[11px] text-[var(--color-faint)]">
            {result.model}
          </span>
        )}
      </div>

      {result.decision?.reasoning && (
        <p className="mt-4 max-w-[620px] text-[14.5px] leading-relaxed text-[var(--color-ink)]">
          {result.decision.reasoning}
        </p>
      )}

      {result.refusal && (
        <div className="mt-4">
          <p className="text-[13.5px] leading-relaxed text-[var(--color-warn)]">
            {result.refusal.detail}
          </p>
          <p className="label mt-2">refused at {result.stage}: {result.refusal.reason}</p>
        </div>
      )}

      {result.error && (
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-bad)]">{result.error}</p>
      )}

      {result.plan && (
        <div className="glass-quiet mt-5 rounded-2xl px-5 py-4">
          <div className="label">Plan</div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <Fact k="Band" v={`±${result.plan.effectiveHalfWidthPct.toFixed(2)}%`} />
            <Fact k="Lower tick" v={result.plan.tickLower.toLocaleString()} />
            <Fact k="Upper tick" v={result.plan.tickUpper.toLocaleString()} />
            <Fact
              k="Asked for"
              v={`±${result.plan.requestedHalfWidthPct.toFixed(2)}%${result.plan.clamped ? " (clamped)" : ""}`}
            />
          </div>
        </div>
      )}

      {result.txHash && (
        <div className="mt-5 flex items-center gap-2">
          <span className="label">Transaction</span>
          <AddressLink value={result.txHash} kind="tx" copyable={false} />
        </div>
      )}

      {s && (
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <Fact
            k="Observed move"
            v={`${s.observedDriftPct.toFixed(3)}% / ${Math.round(s.oracleHorizonSeconds / 3600)}h`}
          />
          <Fact k="Moves left" v={String(s.rebalancesRemaining)} />
          <Fact k="Gas per move" v={`${s.gas.rebalanceCostBot.toFixed(4)} BOT`} />
          <Fact k="Idle funds" v={s.idle.hasFunds ? "yes" : "none"} />
        </div>
      )}
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="label">{k}</div>
      <div className="tabular mt-1 text-[13px] text-[var(--color-mid)]">{v}</div>
    </div>
  );
}
