import { SectionRule } from "@/components/ui/SectionRule";

/**
 * AUTHORITY SCHEMATIC — what the agent can reach, and what does not exist.
 *
 * Security arguments are usually made in prose, which means the reader has to
 * take them on trust. Drawn as a schematic, the claim becomes checkable at a
 * glance: solid lines are paths that exist in the bytecode, and broken lines
 * terminated in a cross are paths that do not exist at all — not paths that are
 * guarded, or monitored, or gated behind a check.
 *
 * That distinction is the actual security property. `CurtisVault` exposes two
 * functions to the agent, and neither takes a destination argument, so there is
 * no arbitrary-call path to sever in the first place. A leaked agent key cannot
 * move a token out of the vault because no instruction sequence in the contract
 * would do it.
 *
 * Rendered server-side: it is a static drawing with no state and no live data,
 * so shipping it as a client component would cost JavaScript for nothing.
 */

const W = 1000;
const H = 430;

/* Box geometry, laid out on a coarse grid so the wiring runs orthogonally the
   way a schematic's does. */
const BOX = { w: 186, h: 74 };

const OWNER = { x: 46, y: 60 };
const VAULT = { x: 402, y: 60 };
const NFPM = { x: 402, y: 246 };
const AGENT = { x: 46, y: 246 };
const ELSEWHERE = { x: 768, y: 246 };

const cx = (b: { x: number }) => b.x + BOX.w / 2;
const cy = (b: { y: number }) => b.y + BOX.h / 2;

export function AuthoritySchematic() {
  return (
    <div>
      <SectionRule
        title="A leaked agent key cannot drain a vault"
        aside="Authority schematic"
      />

      <div className="mt-8 grid gap-x-14 gap-y-10 lg:grid-cols-[1.3fr_0.7fr]">
        <figure>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="Schematic of on-chain authority. The owner can deposit into and withdraw from the vault. The vault mints and burns positions through the BDEX position manager. Curtis, the agent, has two paths into the vault: rebalance and compound. The path from Curtis to any other destination is drawn broken and crossed, because no such path exists in the contract."
          >
            <defs>
              <marker
                id="as-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--color-ink-2)" />
              </marker>
              <marker
                id="as-arrow-brass"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--color-brass)" />
              </marker>
            </defs>

            {/* ── permitted wiring ─────────────────────────────────────────
                Owner ⇄ vault. Two separate lines, because deposit and
                withdraw are separate powers and only one of them survives
                a pause. */}
            <Wire
              d={`M ${OWNER.x + BOX.w} ${OWNER.y + 26} H ${VAULT.x}`}
              label="deposit"
            />
            <Wire
              d={`M ${VAULT.x} ${OWNER.y + 52} H ${OWNER.x + BOX.w}`}
              label="withdrawAll"
              sub="works while paused"
            />

            {/* Vault ⇄ position manager */}
            <Wire
              d={`M ${cx(VAULT) - 34} ${VAULT.y + BOX.h} V ${NFPM.y}`}
              label="mint · burn"
              vertical
            />
            <Wire
              d={`M ${cx(VAULT) + 34} ${NFPM.y} V ${VAULT.y + BOX.h}`}
              label="collect"
              vertical
              labelSide="right"
            />

            {/* Agent → vault: the only two powers it has */}
            <Wire
              d={`M ${AGENT.x + BOX.w} ${AGENT.y + 26} H ${VAULT.x - 60} V ${VAULT.y + BOX.h}`}
              label="rebalance"
              brass
            />
            <Wire
              d={`M ${AGENT.x + BOX.w} ${AGENT.y + 52} H ${VAULT.x - 96} V ${VAULT.y + BOX.h}`}
              label="compound"
              brass
              labelSide="below"
            />

            {/* ── the path that does not exist ─────────────────────────────
                Broken line, crossed at its terminator. The cross is the
                whole diagram: it marks absence, not prohibition. */}
            <g>
              <path
                d={`M ${AGENT.x + BOX.w} ${cy(AGENT) + 6} H ${ELSEWHERE.x - 10}`}
                fill="none"
                stroke="var(--color-oxide)"
                strokeWidth="1.3"
                strokeDasharray="8 6"
                strokeOpacity="0.55"
              />
              {/* the sever */}
              <g stroke="var(--color-oxide)" strokeWidth="2.4" strokeLinecap="round">
                <line x1={ELSEWHERE.x - 74} y1={cy(AGENT) - 8} x2={ELSEWHERE.x - 58} y2={cy(AGENT) + 20} />
                <line x1={ELSEWHERE.x - 58} y1={cy(AGENT) - 8} x2={ELSEWHERE.x - 74} y2={cy(AGENT) + 20} />
              </g>
              <text
                x={ELSEWHERE.x - 88}
                y={cy(AGENT) + 40}
                textAnchor="middle"
                className="label"
                fontSize="8.5"
                fill="var(--color-oxide)"
              >
                NO SUCH PATH
              </text>
            </g>

            {/* ── boxes ────────────────────────────────────────────────── */}
            <Box {...OWNER} title="OWNER" sub="you" note="the only withdrawer" />
            <Box {...VAULT} title="YOUR VAULT" sub="CurtisVault.sol" note="holds the position" heavy />
            <Box {...NFPM} title="POSITION MANAGER" sub="BDEX NFPM" note="pinned at deploy" />
            <Box {...AGENT} title="CURTIS" sub="agent key" note="two functions, no more" brass />
            <Box {...ELSEWHERE} title="ANY OTHER" sub="address" note="unreachable" ghost />
          </svg>
        </figure>

        <div className="lg:pt-2">
          <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)]">
            The agent holds its own key, separate from the deployer and from the
            treasury. Its entire on-chain authority is two functions, and neither
            takes a destination.
          </p>

          <p className="mt-5 text-[14px] leading-relaxed text-[var(--color-ink-3)]">
            So the worst a stolen agent key can do is re-range inside the bounds you
            configured, at most as many times a day as you allowed. It cannot send a
            token anywhere. There is no arbitrary-call path to abuse, which is a
            stronger statement than saying the path is guarded.
          </p>

          {/* This column used to end in a six-row table restating the drawing —
              agent can re-range, cannot withdraw, cannot rotate itself. The
              schematic says all of it in lines, and the rule table below says it
              in contract terms. A third telling was just volume. */}
          <p className="mt-5 text-[13.5px] leading-relaxed text-[var(--color-ink-3)]">
            Each of those is a passing test rather than a design intention — see the
            <span className="meter text-[var(--color-prussian)]"> test_AgentCannot*</span>{" "}
            cases, run against live BDEX on both networks.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── schematic primitives ────────────────────────────────────────────────── */

function Box({
  x,
  y,
  title,
  sub,
  note,
  heavy = false,
  brass = false,
  ghost = false,
}: {
  x: number;
  y: number;
  title: string;
  sub: string;
  note: string;
  heavy?: boolean;
  brass?: boolean;
  ghost?: boolean;
}) {
  const stroke = ghost
    ? "var(--color-ink-4)"
    : brass
      ? "var(--color-brass)"
      : "var(--color-ink)";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={BOX.w}
        height={BOX.h}
        fill={ghost ? "none" : "var(--color-film-2)"}
        stroke={stroke}
        strokeWidth={heavy ? 2.2 : 1.4}
        strokeDasharray={ghost ? "6 5" : undefined}
      />
      <text
        x={x + 14}
        y={y + 25}
        className="label"
        fontSize="9"
        fill={ghost ? "var(--color-ink-4)" : brass ? "var(--color-brass)" : "var(--color-ink)"}
      >
        {title}
      </text>
      <text x={x + 14} y={y + 45} className="meter" fontSize="11.5" fill="var(--color-ink-2)">
        {sub}
      </text>
      <text x={x + 14} y={y + 62} fontSize="10.5" fill="var(--color-ink-4)" fontFamily="var(--font-read)">
        {note}
      </text>
    </g>
  );
}

function Wire({
  d,
  label,
  sub,
  brass = false,
  vertical = false,
  labelSide = "above",
}: {
  d: string;
  label: string;
  sub?: string;
  brass?: boolean;
  vertical?: boolean;
  labelSide?: "above" | "below" | "right";
}) {
  // Label placement is derived from the path's first coordinate pair, which is
  // enough for the orthogonal runs this schematic uses.
  const m = d.match(/M\s+([\d.]+)\s+([\d.]+)/);
  const sx = m ? parseFloat(m[1]) : 0;
  const sy = m ? parseFloat(m[2]) : 0;

  const tx = vertical ? sx + (labelSide === "right" ? 10 : -10) : sx + 16;
  const ty = vertical ? sy + 34 : labelSide === "below" ? sy + 16 : sy - 9;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={brass ? "var(--color-brass)" : "var(--color-ink-2)"}
        strokeWidth="1.3"
        markerEnd={brass ? "url(#as-arrow-brass)" : "url(#as-arrow)"}
      />
      <text
        x={tx}
        y={ty}
        textAnchor={vertical ? (labelSide === "right" ? "start" : "end") : "start"}
        className="label"
        fontSize="8.5"
        fill={brass ? "var(--color-brass)" : "var(--color-ink-3)"}
      >
        {label}
      </text>
      {sub && (
        <text
          x={tx}
          y={ty + 13}
          textAnchor={vertical ? (labelSide === "right" ? "start" : "end") : "start"}
          fontSize="9.5"
          fill="var(--color-ink-4)"
          fontFamily="var(--font-read)"
        >
          {sub}
        </text>
      )}
    </g>
  );
}
