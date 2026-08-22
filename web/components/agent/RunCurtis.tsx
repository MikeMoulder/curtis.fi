"use client";

import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Address as AddressLink } from "@/components/ui/Address";

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
  };
}

/* ==========================================================================
   THE CYCLE STRIP

   Five ruled cells, one per stage of the real pipeline, in the order
   `app/api/agent/run/route.ts` runs them. That strip is the whole explanation
   at a glance: read, judge, check, simulate, sign — with only the last one
   irreversible.

   The detail behind each stage exists, but it is folded away. An earlier
   version of this panel printed all five descriptions, all five stop
   conditions and all five outputs on the page at once, which turned the
   dashboard into a document. The strip is the answer; the disclosure is the
   footnote; the outcome of an actual run is the only prose that appears
   unasked.
   ========================================================================== */

type CellState = "idle" | "running" | "passed" | "held" | "stopped" | "skipped";

const STAGES = [
  {
    key: "read",
    name: "Read",
    what: "Pool state and the pool's own TWAP oracle at four lookbacks, fifteen minutes to a day.",
    stops: "the vault is not one this agent is authorised on",
  },
  {
    key: "judge",
    name: "Judge",
    what:
      "The model sizes a band against the drift it just measured. It answers in percent, never in ticks.",
    stops: "it judges holding correct — the usual answer",
  },
  {
    key: "check",
    name: "Check",
    what:
      "Every rule the vault enforces, re-run here first: straddle, centre, width, alignment, daily budget.",
    stops: "any one of those rules fails",
  },
  {
    key: "simulate",
    name: "Simulate",
    what: "The exact call is run against live chain state without being sent.",
    stops: "it would revert",
  },
  {
    key: "sign",
    name: "Sign",
    what: "Broadcast from the agent's own key, with the reasoning attached on-chain.",
    stops: "nothing — this is the point of no return",
  },
] as const;

/**
 * Where the cycle got to.
 *
 * `hold` is the case worth reading twice. The server routes a hold through the
 * same guard that produces refusals, so it arrives as `stage: "guard"` — but a
 * hold is a judgement, not a rule failing, and marking it as a refusal would
 * teach the reader the opposite of the truth.
 */
function cellStates(result: RunResult | null, active: number | null): CellState[] {
  if (!result) {
    return STAGES.map((_, i) =>
      active === null ? "idle" : i < active ? "passed" : i === active ? "running" : "idle"
    );
  }
  const held = result.refusal?.reason === "hold";
  const stop = (at: number, mark: CellState = "stopped"): CellState[] =>
    STAGES.map((_, i) => (i < at ? "passed" : i === at ? mark : "skipped"));

  if (!result.signals) return stop(0);
  if (result.stage === "decide") return stop(1);
  if (held) return stop(1, "held");
  if (result.stage === "guard") return stop(2);
  if (result.stage === "dry-run")
    return STAGES.map((_, i) => (i <= 2 ? "passed" : "skipped"));
  if (result.stage === "execute") return stop(3);
  return STAGES.map((_, i) => (i < 4 ? "passed" : result.acted ? "passed" : "stopped"));
}

export function RunCurtis({ vault, onActed }: { vault: Address; onActed: () => void }) {
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setActive(0);

    // The server really does read, then decide, then execute in this order, and
    // the model call dominates the wall clock. These are the observed timings of
    // that sequence, not a decorative progress bar.
    timers.current.push(window.setTimeout(() => setActive(1), 900));
    timers.current.push(window.setTimeout(() => setActive(3), 4600));

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
      setActive(null);
    }
  };

  const states = cellStates(running ? null : result, running ? active : null);

  return (
    <section className="plate">
      {/* ── header: the action, and the one option worth exposing ────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b border-[var(--color-ink)] px-5 py-4">
        <h2 className="head text-[16px]">Run a cycle</h2>
        <div className="flex items-center gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--color-ink-3)]">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="size-3.5 accent-[var(--color-oxide)]"
            />
            Stop before signing
          </label>
          <Button variant="primary" onClick={run} loading={running}>
            {running ? "Working" : "Run Curtis"}
          </Button>
        </div>
      </div>

      {/* ── the strip ────────────────────────────────────────────────────── */}
      <ol className="grid grid-cols-5">
        {STAGES.map((s, i) => (
          <Cell key={s.key} index={i + 1} name={s.name} state={states[i]} last={i === 4} />
        ))}
      </ol>

      {/* ── the outcome, and nothing else unless there is one ─────────────── */}
      <div aria-live="polite">{result && !running && <Outcome result={result} />}</div>

      {/* ── the footnote, folded ─────────────────────────────────────────── */}
      <details className="group border-t border-[var(--hair-2)]">
        <summary className="label flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 transition-colors hover:!text-[var(--color-ink)]">
          <span className="transition-transform group-open:rotate-90" aria-hidden="true">
            ▸
          </span>
          What these five steps do
        </summary>
        <dl className="px-5 pb-5">
          {STAGES.map((s, i) => (
            <div
              key={s.key}
              className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-[var(--hair)] py-3 sm:grid-cols-[auto_7ch_1fr]"
            >
              <dt className="meter text-[11px] text-[var(--color-ink-4)]">
                {String(i + 1).padStart(2, "0")}
              </dt>
              <dt className="label !text-[var(--color-ink)]">{s.name}</dt>
              <dd className="col-start-2 mt-1.5 sm:col-start-3 sm:mt-0">
                <p className="text-[13px] leading-relaxed text-[var(--color-ink-2)]">{s.what}</p>
                <p className="mt-1 text-[12px] text-[var(--color-ink-4)]">Stops if {s.stops}.</p>
              </dd>
            </div>
          ))}
          <p className="mt-4 max-w-[74ch] text-[12px] leading-relaxed text-[var(--color-ink-3)]">
            The first four cost nothing and any of them can end the cycle. Only
            the fifth is irreversible, and it happens last — which is why a wrong
            answer from a model cannot become a wrong position.
          </p>
        </dl>
      </details>
    </section>
  );
}

/* ── one cell of the strip ────────────────────────────────────────────────── */

const MARK: Record<CellState, { glyph: string; ink: string }> = {
  idle: { glyph: "·", ink: "var(--color-ink-4)" },
  running: { glyph: "▸", ink: "var(--color-brass)" },
  passed: { glyph: "✓", ink: "var(--color-prussian)" },
  held: { glyph: "=", ink: "var(--color-ink-2)" },
  stopped: { glyph: "✕", ink: "var(--color-oxide)" },
  skipped: { glyph: "·", ink: "var(--color-ink-4)" },
};

function Cell({
  index,
  name,
  state,
  last,
}: {
  index: number;
  name: string;
  state: CellState;
  last: boolean;
}) {
  const mark = MARK[state];
  return (
    <li
      className={`px-2 py-3.5 text-center transition-opacity duration-500 ${
        last ? "" : "border-r border-[var(--hair)]"
      } ${state === "skipped" ? "opacity-40" : ""} ${
        state === "running" ? "bg-[var(--color-brass-bg)]" : ""
      }`}
      title={state === "idle" ? undefined : state}
    >
      <div className="meter text-[10px] text-[var(--color-ink-4)]">
        {String(index).padStart(2, "0")}
      </div>
      <div className="label mt-1.5 !text-[10px] !tracking-[0.08em] !text-[var(--color-ink)]">
        {name}
      </div>
      <div
        className={`meter mt-2 text-[13px] leading-none ${state === "running" ? "pulse" : ""}`}
        style={{ color: mark.ink }}
        aria-label={state}
      >
        {mark.glyph}
      </div>
    </li>
  );
}

/* ── what came back ──────────────────────────────────────────────────────── */

function Outcome({ result }: { result: RunResult }) {
  const held = result.refusal?.reason === "hold";
  const s = result.signals;

  const verdict = result.acted
    ? { tone: "inrange" as const, word: result.plan?.action ?? "acted" }
    : held
      ? { tone: "neutral" as const, word: "held" }
      : result.stage === "dry-run"
        ? { tone: "accent" as const, word: "not sent" }
        : { tone: "outrange" as const, word: "refused" };

  // One sentence, in this priority: the model's own reasoning if it produced
  // any, otherwise whatever stopped the cycle.
  const line =
    result.decision?.reasoning ||
    result.refusal?.detail ||
    result.error ||
    (result.stage === "dry-run" ? "Checked and simulated; broadcast skipped." : "");

  const facts: [string, string][] = [];
  if (result.plan)
    facts.push([
      "Band",
      `±${result.plan.effectiveHalfWidthPct.toFixed(2)}% · ${result.plan.tickLower.toLocaleString()}→${result.plan.tickUpper.toLocaleString()}`,
    ]);
  if (result.decision)
    facts.push(["Confidence", `${(result.decision.confidenceBps / 100).toFixed(0)}%`]);
  if (s)
    facts.push([
      "Drift read",
      `${s.observedDriftPct.toFixed(3)}% / ${Math.round(s.oracleHorizonSeconds / 3600)}h`,
    ]);
  if (s) facts.push(["Moves left", String(s.rebalancesRemaining)]);

  return (
    <div className="border-t border-[var(--hair-2)] px-5 py-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Pill tone={verdict.tone} dot>
          {verdict.word}
        </Pill>
        {result.refusal && !held && (
          <span className="meter text-[11.5px] text-[var(--color-oxide)]">
            {result.refusal.reason}
          </span>
        )}
        {result.txHash && (
          <span className="ml-auto">
            <AddressLink value={result.txHash} kind="tx" copyable={false} />
          </span>
        )}
      </div>

      {line && (
        <p className="mt-3.5 max-w-[76ch] border-l-2 border-[var(--color-brass)] pl-4 text-[14px] leading-relaxed text-[var(--color-ink)]">
          {line}
        </p>
      )}

      {facts.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
          {facts.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2.5">
              <dt className="label !text-[var(--color-ink-4)]">{k}</dt>
              <dd className="meter text-[12px] text-[var(--color-ink-2)]">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
