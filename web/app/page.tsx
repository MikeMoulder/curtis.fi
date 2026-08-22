import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroGauge } from "@/components/viz/HeroGauge";
import { ConcentrationStudy } from "@/components/viz/ConcentrationStudy";
import { AuthoritySchematic } from "@/components/viz/AuthoritySchematic";
import { Reveal } from "@/components/ui/Reveal";
import { SectionRule } from "@/components/ui/SectionRule";

/** Measured off BDEX on 15 August 2026 — stated with its date so it ages honestly. */
const M = {
  tvl: "30.1M",
  volume: "1.3–2.7M",
  apr: "6.4",
  aprRange: "4.7–9.9",
  positions: "911",
};

export default function Home() {
  return (
    <>
      <Header />

      {/* ══ HERO ═══════════════════════════════════════════════════════════
          The thesis, stated as the single most important fact about providing
          concentrated liquidity, with the instrument that answers it directly
          underneath. */}
      <section className="sheet pt-16 pb-24 md:pt-24">
        <Reveal>
          <span className="label">BDEX · USDT / WBOT · 0.30% tier</span>
        </Reveal>

        <div className="mt-8">
          <Reveal delay={70}>
            {/* Full sheet width. In a column this headline wraps to four lines
                and stops being a thesis; given the whole measure it sits on
                two, which is the shape it was written for. */}
            <h1 className="display text-[clamp(42px,8.2vw,116px)]">
              Out of range
              <br />
              <span className="display-em">earns nothing.</span>
            </h1>
          </Reveal>

          <div className="mt-11 grid gap-x-16 gap-y-8 lg:grid-cols-[1fr_1fr]">
            <Reveal delay={150}>
              <p className="lead">
                A concentrated position only collects fees while the market price
                sits between the two ticks you chose. Price moves all day. The band
                does not — unless something moves it.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <p className="max-w-[50ch] text-[15px] leading-relaxed text-[var(--color-ink-3)]">
                Curtis is that something. It holds the band over the market as the
                market moves, and signs every one of those decisions with its own
                key — inside limits your vault enforces in its own code.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link
                  href="/dashboard"
                  className="group inline-flex h-11 items-center gap-2.5 bg-[var(--color-ink)] px-6 text-[12px] tracking-[0.14em] text-[var(--color-film)] uppercase transition-colors hover:bg-[var(--color-oxide)]"
                  style={{ fontFamily: "var(--font-meter)" }}
                >
                  Open a vault
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
                <Link
                  href="#study"
                  className="label underline decoration-[var(--hair-2)] underline-offset-[5px] transition-colors hover:!text-[var(--color-oxide)]"
                >
                  Why width is the whole problem
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        {/* The instrument, with the live readout as its own caption. There is no
            separate ticker above it: price, tick and band appeared twice on this
            screen, and a number stated twice is a number the reader has to
            reconcile. */}
        <Reveal delay={230} className="mt-16">
          <HeroGauge />
        </Reveal>
      </section>

      {/* ══ THE MARKET ═════════════════════════════════════════════════════ */}
      <section className="sheet pb-28">
        <Reveal>
          <SectionRule
            title="What the pool actually does"
            aside="Measured 15 Aug 2026 · 14 days"
          />

          <dl className="grid sm:grid-cols-3">
            <Figure
              value={`$${M.tvl}`}
              label="Pool liquidity"
              note="USDT / WBOT, the only 0.30% tier with depth on this chain"
            />
            <Figure
              value={`$${M.volume}`}
              label="Daily volume"
              note="observed range across fourteen consecutive days"
            />
            <Figure
              value={`${M.apr}%`}
              label="Passive fee APR"
              note={`${M.aprRange}% daily. Fees ÷ total pool liquidity — what a full-range position earns`}
              measured
            />
          </dl>
        </Reveal>
      </section>

      {/* ══ THE STUDY ══════════════════════════════════════════════════════ */}
      <section id="study" className="sheet scroll-mt-20 pb-28">
        <Reveal>
          <ConcentrationStudy />
        </Reveal>
      </section>

      {/* ══ THE GAP ════════════════════════════════════════════════════════ */}
      <section className="sheet pb-28">
        <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div className="lg:sticky lg:top-24">
              <div className="label">The gap</div>
              <div
                className="meter mt-5 text-[clamp(56px,9vw,104px)] leading-[0.82] text-[var(--color-oxide)]"
                style={{ fontVariationSettings: '"wdth" 88' }}
              >
                {M.positions}
              </div>
              <p className="mt-5 max-w-[30ch] text-[13.5px] leading-relaxed text-[var(--color-ink-3)]">
                positions have ever been opened in a pool doing up to $2.7M of
                volume a day. Not 911 open now — 911 in total, since the pool
                existed.
              </p>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <h2 className="head text-[clamp(25px,3.2vw,40px)]">
                Managing a range by hand is a night shift.
              </h2>
            </Reveal>

            <Reveal delay={70}>
              <p className="lead mt-7">
                The correct range moves whenever price does. Holding one means
                watching a chart around the clock, judging how wide is right for
                today rather than last week, and weighing every adjustment against
                the gas it burns. Move too eagerly and fees never cover the cost.
                Move too slowly and the capital sits outside the band earning
                exactly zero.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-5 max-w-[54ch] text-[15px] leading-relaxed text-[var(--color-ink-3)]">
                So most people set a range once and never come back.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ THE CYCLE ══════════════════════════════════════════════════════
          This list used to be the last element inside the section above — a
          10px label under three paragraphs about a different subject. It is the
          answer to the first question anyone asks about an agent that spends
          money, so it now gets a section, a rule and the full sheet width. */}
      <section className="sheet pb-28">
        <Reveal>
          <SectionRule
            title="How Curtis actually works"
            aside="One cycle, in order"
          />
        </Reveal>

        <Reveal delay={70}>
          <p className="mt-6 max-w-[68ch] text-[14.5px] leading-relaxed text-[var(--color-ink-2)]">
            Five steps, always this order. Each consumes the previous one&apos;s
            output, and any of the first four can end the cycle without a
            transaction — which is the point: the only irreversible step is the
            last one, so a wrong answer from a model cannot become a wrong
            position.
          </p>
        </Reveal>

        <div className="mt-12 border-t border-[var(--color-ink)]">
          {STAGES.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <Stage index={i + 1} {...s} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ AUTHORITY ══════════════════════════════════════════════════════
          The schematic and the rule table are one argument, so they are one
          section. Split across two, the reader met the same claim twice —
          once drawn, once tabulated — and read the repetition as volume. */}
      <section className="sheet pb-28">
        <Reveal>
          <AuthoritySchematic />
        </Reveal>

        <Reveal delay={70}>
          <div className="mt-20">
            <SectionRule
              title="What the vault refuses"
              aside="Checked in the contract, before execution"
              level="h3"
            />

            <p className="mt-6 max-w-[62ch] text-[14.5px] leading-relaxed text-[var(--color-ink-2)]">
              Every rule below is enforced inside the contract at the point of
              call — not audited afterwards. Which is why a mistaken model, or a
              stolen agent key, still cannot produce a harmful position.
            </p>

            {/* Two columns: as one long list this was a wall, and it is a spec
                sheet, which is a thing readers scan rather than read. */}
            <div className="mt-8 grid gap-x-12 sm:grid-cols-2">
              {RULES.map(([rule, why, where]) => (
                <div key={rule} className="border-t border-[var(--hair)] py-4">
                  <div className="flex items-baseline justify-between gap-5">
                    <span className="text-[14.5px] text-[var(--color-ink)]">
                      {rule}
                    </span>
                    <span className="label shrink-0 !text-[var(--color-prussian)]">
                      {where}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-[44ch] text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                    {why}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ CLOSE ══════════════════════════════════════════════════════════ */}
      <section className="sheet pb-8">
        <Reveal>
          <div className="border-t border-[var(--color-ink)] pt-12">
            <div className="grid items-end gap-x-16 gap-y-8 lg:grid-cols-[1.2fr_0.8fr]">
              <h2 className="display text-[clamp(34px,5.6vw,74px)]">
                Put it
                <br />
                <span className="display-em">to work.</span>
              </h2>
              <div>
                <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)]">
                  Create a vault, set the bounds Curtis has to operate inside, and
                  deposit when you are ready. Only you can withdraw, and withdrawal
                  keeps working even while everything else is paused.
                </p>
                <Link
                  href="/dashboard"
                  className="group mt-7 inline-flex h-11 items-center gap-2.5 bg-[var(--color-ink)] px-6 text-[12px] tracking-[0.14em] text-[var(--color-film)] uppercase transition-colors hover:bg-[var(--color-oxide)]"
                  style={{ fontFamily: "var(--font-meter)" }}
                >
                  Open a vault
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </>
  );
}

/* ── content ──────────────────────────────────────────────────────────────── */

/* The five stages the server genuinely runs, in `app/api/agent/run/route.ts`
   order. Simulate used to be folded into "Sign", which hid the step that does
   the most work to make the thing safe: the call is executed against real chain
   state, and the contract's own reverts happen, before anything is broadcast. */
const STAGES = [
  {
    title: "Read",
    body: "Pool state and the pool's own TWAP oracle at four lookbacks — fifteen minutes to a day. Realised volatility, not a forecast.",
    stops: "the caller names a vault this agent is not authorised on",
    out: "spot, drift, idle balances, gas",
  },
  {
    title: "Judge",
    body: "Those figures go to the model as prose, with units. It answers with a band width as a percentage and whether moving is worth its gas — never with raw ticks, because tick arithmetic is mechanical and belongs in code.",
    stops: "it judges holding to be correct, which is the usual answer",
    out: "a width in percent, and a confidence",
  },
  {
    title: "Check",
    body: "The same rules the contract enforces, re-run off-chain first: straddles the price, centred near it, width inside your bounds, ticks aligned, daily budget unspent. A refusal here costs nothing and can explain itself; a refusal on-chain costs gas and cannot.",
    stops: "any one of those rules fails",
    out: "aligned ticks, or a stated reason",
  },
  {
    title: "Simulate",
    body: "The exact call is executed against current chain state without being sent. The contract's own checks run for real, on real state, so a transaction that would revert is discovered for free.",
    stops: "it would revert",
    out: "a call known to succeed",
  },
  {
    title: "Sign",
    body: "Broadcast from the agent's own key. The reasoning and the confidence go on-chain with the transaction, so the decision log is not our word for it.",
    stops: "nothing — this is the point of no return",
    out: "a transaction hash",
  },
] as const;

const RULES: [string, string, string][] = [
  ["Range must straddle the price", "A band sitting entirely to one side is a directional bet, not liquidity", "slot0()"],
  ["Centre must track spot", "Within a set number of ticks of the midpoint, so ranges follow the market rather than lag it", "maxCentreOffset"],
  ["Width stays inside your bounds", "No dust bands, and no full-width position passing itself off as management", "min/maxRangeWidth"],
  ["Ticks aligned to spacing", "Multiples of 60, checked before the pool can reject them more expensively", "tickSpacing"],
  ["Capped moves per day", "A rolling 24-hour counter, so churn and gas burn have a ceiling", "maxRebalancesPerDay"],
  ["Slippage bounds must be set", "A zero bound is an unbounded mint", "amountMin"],
  ["One pool, fixed at deploy", "Immutable in the constructor — it cannot be redirected to a lookalike token", "immutable"],
  ["No path to move your funds", "The agent has two functions. Neither can send a token anywhere but your vault", "structural"],
];

/* ── pieces ───────────────────────────────────────────────────────────────── */

function Figure({
  value,
  label,
  note,
  measured = false,
}: {
  value: string;
  label: string;
  note: string;
  measured?: boolean;
}) {
  return (
    <div className="border-b border-[var(--hair)] py-6 sm:not-last:border-r sm:pr-6 sm:not-first:pl-6">
      <dt className="label">{label}</dt>
      <dd>
        <div
          className={`meter mt-3 text-[clamp(26px,2.9vw,36px)] leading-none ${
            measured ? "text-[var(--color-oxide)]" : "text-[var(--color-ink)]"
          }`}
        >
          {value}
        </div>
        <p className="mt-3 max-w-[26ch] text-[12px] leading-snug text-[var(--color-ink-3)]">
          {note}
        </p>
      </dd>
    </div>
  );
}

function Stage({
  index,
  title,
  body,
  stops,
  out,
}: {
  index: number;
  title: string;
  body: string;
  stops: string;
  out: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-6 border-b border-[var(--hair)] py-6 md:grid-cols-[auto_1.7fr_1fr] md:gap-x-10">
      <span className="meter pt-1 text-[12px] text-[var(--color-ink-4)]">
        {String(index).padStart(2, "0")}
      </span>
      <div>
        <h3
          className="text-[17px] tracking-[-0.01em]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"wdth" 100',
            fontWeight: 600,
          }}
        >
          {title}
        </h3>
        <p className="mt-2 max-w-[58ch] text-[14px] leading-relaxed text-[var(--color-ink-2)]">
          {body}
        </p>
      </div>

      {/* What each step hands on, and what makes it the last one. A reader
          deciding whether to trust this needs the second column more than the
          first — an agent whose every step can refuse is a different object
          from one that always acts. */}
      <div className="col-start-2 mt-4 md:col-start-3 md:mt-1">
        <div className="flex items-baseline gap-2.5">
          <span className="label !text-[var(--color-ink-4)]">yields</span>
          <span className="meter text-[11.5px] text-[var(--color-prussian)]">{out}</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span className="label !text-[var(--color-ink-4)]">stops if</span>
          <span className="max-w-[30ch] text-[12px] leading-snug text-[var(--color-ink-3)]">
            {stops}
          </span>
        </div>
      </div>
    </div>
  );
}
