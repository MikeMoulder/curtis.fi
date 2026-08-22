import Link from "next/link";
import { CurtisMark } from "@/components/curtis/CurtisMark";
import { addresses } from "@/lib/addresses";
import { activeChain, ACTIVE_CHAIN_ID, explorerAddress, isTestnet } from "@/lib/chains";

const MEASURED_ON = "15 August 2026";

/**
 * A DRAWING TITLE BLOCK.
 *
 * Every engineering drawing ends in one, and its fields are not decorative —
 * they record who drew the thing and who checked it, because those are
 * different people and the distinction is the whole quality system.
 *
 * That maps exactly onto this project's architecture, which is why the device
 * is here rather than borrowed for looks: Curtis DRAWS (the off-chain policy
 * chooses a range) and CurtisVault CHECKS (the contract refuses anything
 * outside the owner's bounds). The title block states that split as fact, and
 * every address in it is a link an outsider can verify before connecting a
 * wallet. On a chain this young, checkable addresses are the difference
 * between a product and a page.
 */
export function Footer() {
  const rows: [string, string, string | null][] = [
    ["Vault factory", "CurtisFactory.sol", addresses.curtisFactory],
    ["Pool", "USDT / WBOT · 0.30%", addresses.pool],
    ["Position manager", "BDEX NFPM", addresses.positionManager],
  ];

  return (
    <footer className="mt-24 border-t border-[var(--color-ink)]">
      <div className="sheet py-12">
        {/* ── the block ───────────────────────────────────────────────────
            Ruled cells, like the real thing. Grid lines are the structure,
            so there are no card borders fighting them. */}
        <div className="border border-[var(--hair-2)]">
          <div className="grid md:grid-cols-[1.5fr_1fr_1fr]">
            {/* drawn by */}
            <Cell label="Drawn" className="md:border-r">
              <div className="flex items-center gap-2.5">
                <CurtisMark size={28} state="idle" decorative />
                <span className="text-[14px] text-[var(--color-ink)]">
                  Curtis — off-chain policy
                </span>
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                Reads the pool, sizes the band against observed volatility,
                signs with its own key.
              </p>
            </Cell>

            {/* checked by */}
            <Cell label="Checked" className="md:border-r">
              <span className="meter text-[13px] text-[var(--color-ink)]">
                CurtisVault.sol
              </span>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                Refuses any range that is one-sided, off-centre, mis-sized or
                over the daily limit.
              </p>
            </Cell>

            {/* sheet data */}
            <Cell label="Sheet">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <Field k="Network" v={`${activeChain.name} · ${ACTIVE_CHAIN_ID}`} />
                <Field k="Tier" v="0.30% · spacing 60" />
                <Field k="Tests" v="46 fork · both networks" />
                <Field k="Measured" v={MEASURED_ON} />
                <Field k="Rev" v={isTestnet ? "testnet" : "mainnet"} />
              </dl>
            </Cell>
          </div>

          {/* ── addresses ──────────────────────────────────────────────── */}
          <div className="grid border-t border-[var(--hair-2)] sm:grid-cols-3">
            {rows.map(([label, sub, addr], i) => (
              <div
                key={label}
                className={`px-5 py-4 ${
                  i > 0 ? "border-t border-[var(--hair-2)] sm:border-t-0 sm:border-l" : ""
                }`}
              >
                <div className="label">{label}</div>
                <div className="mt-2 text-[12.5px] text-[var(--color-ink-2)]">{sub}</div>
                {addr ? (
                  <a
                    href={explorerAddress(addr)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meter mt-1 block text-[11.5px] text-[var(--color-prussian)] underline decoration-[var(--hair-2)] underline-offset-[3px] transition-colors hover:text-[var(--color-oxide)] hover:decoration-[var(--color-oxide)]"
                  >
                    {addr.slice(0, 10)}…{addr.slice(-8)}
                  </a>
                ) : (
                  <span className="meter mt-1 block text-[11.5px] text-[var(--color-ink-4)]">
                    not deployed on this network
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── links + notes ─────────────────────────────────────────────── */}
        <div className="mt-10 flex flex-wrap gap-x-10 gap-y-6">
          <nav className="flex flex-wrap gap-x-7 gap-y-3">
            <Anchor href="/dashboard">Your vault</Anchor>
            <Anchor href="/activity">Decision log</Anchor>
            <External href={activeChain.blockExplorers.default.url}>Explorer</External>
            <External href="https://dex.botchain.ai">BDEX</External>
            {isTestnet && (
              <External href="https://faucet.bohr.life/basic/">Faucet</External>
            )}
          </nav>
        </div>

        <div className="rule mt-8" />

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:justify-between">
          {/* Four sentences here became three, and the measurement date left with
              one of them — it is already a field in the block above, and a footer
              that says the same date twice reads as boilerplate. */}
          <p className="max-w-[600px] text-[11.5px] leading-relaxed text-[var(--color-ink-4)]">
            Figures come from BDEX pool data, measured on the date above. Passive
            APR is fees over total pool liquidity — what a full-range position
            earns, and the honest denominator for every comparison made here.
            Providing liquidity carries risk including impermanent loss, which
            Curtis reduces and cannot remove. Not financial advice.
          </p>
          <p className="label shrink-0">BOT Chain Builder Challenge</p>
        </div>
      </div>
    </footer>
  );
}

function Cell({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-[var(--hair-2)] px-5 py-4 not-last:border-b md:not-last:border-b-0 ${className}`}>
      <div className="label">{label}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="label !tracking-[0.1em]">{k}</dt>
      <dd className="meter text-[11.5px] text-[var(--color-ink-2)]">{v}</dd>
    </>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="label transition-colors hover:!text-[var(--color-oxide)]"
    >
      {children}
    </Link>
  );
}

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="label transition-colors hover:!text-[var(--color-oxide)]"
    >
      {children}
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}
