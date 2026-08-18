import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Curtis } from "@/components/curtis/Curtis";
import { HeroCurtis } from "@/components/curtis/HeroCurtis";
import { ConcentrationStudy } from "@/components/viz/ConcentrationStudy";
import { LiveStrip } from "@/components/viz/LiveStrip";
import { Reveal } from "@/components/ui/Reveal";

/** Measured off BDEX on 15 Aug 2026 — stated with its date so it ages honestly. */
const M = {
  tvl: "30.1M",
  volume: "1.3–2.7M",
  apr: "6.4",
  aprRange: "4.7–9.9",
  positions: "911",
  asOf: "15 August 2026",
};

export default function Home() {
  return (
    <>
      <Header />

      {/* ══ hero ══════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto flex min-h-[100svh] max-w-[1240px] flex-col justify-center px-6 pt-28 pb-14">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Reveal>
              <div className="label">Autonomous liquidity · BDEX</div>
            </Reveal>

            <Reveal delay={90}>
              <h1 className="display mt-7 text-[clamp(50px,8.4vw,122px)]">
                Liquidity that
                <br />
                <span className="display-em text-[var(--color-accent)]">keeps its place.</span>
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <p className="lead mt-9 max-w-[490px]">
                A position on BDEX only earns while the price sits inside the range
                you chose. Curtis picks that range, holds it over the market as it
                moves, and folds the fees back in, inside limits your vault enforces
                in its own code.
              </p>
            </Reveal>

            <Reveal delay={260}>
              <div className="mt-11 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link
                  href="/dashboard"
                  className="group relative inline-flex h-12 items-center gap-3 rounded-full bg-[var(--color-ink)] px-7 text-[13.5px] font-medium text-[var(--color-void)] transition-all duration-300 hover:gap-4"
                >
                  Open your vault
                  <svg className="size-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 7h10M8 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>

                <Link
                  href="#study"
                  className="text-[13.5px] text-[var(--color-mid)] underline-offset-[6px] transition-colors hover:text-[var(--color-ink)] hover:underline"
                >
                  See why it matters
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={140} className="flex justify-center lg:justify-end">
            <HeroCurtis size={250} />
          </Reveal>
        </div>

        <Reveal delay={340} className="mt-auto pt-16">
          <div className="rule-fade mb-6" />
          <LiveStrip />
        </Reveal>
      </section>

      {/* ══ the measured market ═══════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1240px] px-6 py-24">
        <Reveal>
          <div className="grid gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            <Figure value={`$${M.tvl}`} label="Pool liquidity" note="USDT / WBOT, 0.3% tier" />
            <Figure value={`$${M.volume}`} label="Daily volume" note="observed over 14 days" />
            <Figure
              value={`${M.apr}%`}
              label="Passive fee APR"
              note={`${M.aprRange}% daily, from real trading`}
              accent
            />
            <Figure
              value={M.positions}
              label="Positions ever opened"
              note="against a $30M pool"
            />
          </div>
        </Reveal>
      </section>

      {/* ══ the study ═════════════════════════════════════════════════════ */}
      <section id="study" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 py-16">
        <Reveal>
          <ConcentrationStudy />
        </Reveal>
      </section>

      {/* ══ the gap ═══════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1240px] px-6 py-32">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Reveal>
            <div className="lg:sticky lg:top-32">
              <div className="label">The gap</div>
              <div className="display mt-6 text-[clamp(80px,11vw,150px)] leading-[0.82] text-[var(--color-accent)]">
                {M.positions}
              </div>
              <p className="mt-6 max-w-[280px] text-[13.5px] leading-relaxed text-[var(--color-lo)]">
                positions have ever been opened in this pool. That is the entire history of
                concentrated liquidity on this chain.
              </p>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <h2 className="display text-[clamp(30px,3.6vw,46px)]">
                Managing a range by hand is
                <span className="display-em"> a night shift.</span>
              </h2>
            </Reveal>

            <Reveal delay={80}>
              <p className="lead mt-8">
                The correct range moves whenever the price does. Holding one means
                watching a chart around the clock, judging how wide is right for
                today&rsquo;s conditions, and weighing every adjustment against the gas
                it burns. Move too eagerly and the fees never cover the cost. Move too
                slowly and the position sits out of range earning nothing.
              </p>
            </Reveal>

            <Reveal delay={140}>
              <p className="lead mt-6">
                So most people set a range once and never come back. That is the gap:
                a ${M.tvl} pool generating real fees every day, with almost nobody
                positioned to collect them properly.
              </p>
            </Reveal>

            <div className="mt-16 space-y-0">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 70}>
                  <Step index={i + 1} {...s} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ guardrails ════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1240px] px-6 pb-32">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Reveal>
            <div>
              <div className="label">Enforcement</div>
              <h2 className="display mt-6 text-[clamp(30px,3.6vw,46px)]">
                Curtis decides.
                <br />
                <span className="display-em">Your vault refuses.</span>
              </h2>
              <p className="mt-8 max-w-[330px] text-[14px] leading-relaxed text-[var(--color-mid)]">
                Every rule below is checked in the contract before anything executes.
                A mistaken or stolen agent still cannot produce a harmful
                position.
              </p>
              <p className="mt-5 max-w-[330px] text-[14px] leading-relaxed text-[var(--color-mid)]">
                He holds two powers, re-range and compound, and neither can send a
                token anywhere but your vault. Only you can withdraw, and withdrawal
                works even while everything else is paused.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="glass overflow-hidden rounded-3xl">
              {RULES.map(([rule, why], i) => (
                <div key={rule}>
                  {i > 0 && <div className="rule" />}
                  <div className="flex items-baseline gap-5 px-6 py-5">
                    <span className="tabular w-6 shrink-0 text-[11px] text-[var(--color-faint)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14.5px] text-[var(--color-ink)]">{rule}</div>
                      <div className="mt-1 text-[12.5px] text-[var(--color-lo)]">{why}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ close ═════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-[1240px] px-6 pb-36">
        <Reveal>
          <div className="glass flex flex-col items-center rounded-[32px] px-8 py-20 text-center">
            <Curtis size={120} state="success" />
            <h2 className="display mt-12 text-[clamp(32px,4.4vw,58px)]">
              Put him to work.
            </h2>
            <p className="lead mt-6 max-w-[420px]">
              Create a vault, set the limits he has to operate inside, and deposit
              when you are ready. You can withdraw at any moment.
            </p>
            <Link
              href="/dashboard"
              className="mt-10 inline-flex h-12 items-center gap-3 rounded-full bg-[var(--color-ink)] px-7 text-[13.5px] font-medium text-[var(--color-void)] transition-all duration-300 hover:gap-4"
            >
              Open your vault
              <svg className="size-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Curtis size={20} interactive={false} state="idle" />
            <span className="display text-[16px]">Curtis</span>
          </div>
          <p className="max-w-[440px] text-[11.5px] leading-relaxed text-[var(--color-faint)]">
            Figures measured from BDEX pool data on {M.asOf}. Passive APR is fees
            divided by total pool liquidity. Providing liquidity carries risk,
            including impermanent loss, which Curtis reduces and cannot remove. Past
            fee generation does not guarantee future returns.
          </p>
        </div>
      </footer>
    </>
  );
}

/* ── content ──────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    title: "Watches",
    body: "Reads pool state and recent volatility continuously. Wide bands when the market is jumpy, tight when it is calm.",
  },
  {
    title: "Weighs",
    body: "Compares the fees a move would win against the gas it costs. Choosing not to act is most of the job.",
  },
  {
    title: "Acts",
    body: "Signs with his own key and submits. Every decision lands on-chain with its reasoning attached.",
  },
] as const;

const RULES: [string, string][] = [
  ["Range must straddle the price", "A one-sided range earns nothing"],
  ["Width stays within your bounds", "No dust ranges, no full-width positions passing as management"],
  ["Must stay centred on spot", "Ranges have to track the market, not lag it"],
  ["Capped moves per day", "Limits churn and gas burn"],
  ["Slippage bounds required", "No unbounded mints"],
  ["One pool, fixed at deploy", "Cannot be redirected to a lookalike"],
];

/* ── pieces ───────────────────────────────────────────────────────────────── */

function Figure({
  value,
  label,
  note,
  accent = false,
}: {
  value: string;
  label: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="border-l border-white/[0.08] pl-5">
      <div className="label">{label}</div>
      <div
        className={`tabular mt-3 text-[clamp(28px,3vw,38px)] leading-none font-medium ${
          accent ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]"
        }`}
      >
        {value}
      </div>
      <div className="mt-3 text-[12px] leading-snug text-[var(--color-faint)]">{note}</div>
    </div>
  );
}

function Step({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <div className="flex items-start gap-7 border-t border-white/[0.07] py-7">
      <span className="display mt-1 w-9 shrink-0 text-[30px] text-[var(--color-faint)]">
        {index}
      </span>
      <div className="min-w-0">
        <h3 className="text-[17px] font-medium tracking-[-0.01em]">{title}</h3>
        <p className="mt-2 max-w-[440px] text-[14px] leading-relaxed text-[var(--color-mid)]">
          {body}
        </p>
      </div>
    </div>
  );
}
