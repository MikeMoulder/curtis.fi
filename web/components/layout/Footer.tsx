import Link from "next/link";
import { Curtis } from "@/components/curtis/Curtis";
import { addresses } from "@/lib/addresses";
import { activeChain, ACTIVE_CHAIN_ID, explorerAddress, isTestnet } from "@/lib/chains";

const MEASURED_ON = "15 August 2026";

/**
 * The footer does real work rather than holding a logo and a legal line.
 *
 * Every contract the product touches is listed with a link to the explorer, so
 * a visitor can verify what they are about to interact with before connecting a
 * wallet. On a chain this young that is the difference between a product and a
 * page: the addresses are the claim, and they are checkable.
 */
export function Footer() {
  const contracts: [string, string | null][] = [
    ["Vault factory", addresses.curtisFactory],
    ["BDEX pool", addresses.pool],
    ["Position manager", addresses.positionManager],
  ];

  return (
    <footer className="mt-auto border-t border-white/[0.07]">
      <div className="mx-auto max-w-[1240px] px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* brand */}
          <div>
            <div className="flex items-center gap-3">
              <Curtis size={26} interactive={false} state="idle" />
              <span className="display text-[19px]">Curtis</span>
            </div>
            <p className="mt-5 max-w-[260px] text-[13px] leading-relaxed text-[var(--color-lo)]">
              An autonomous agent that holds a concentrated liquidity position
              over the market price on BDEX, inside limits your vault enforces
              in its own code.
            </p>

            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span
                className={`pulse size-1.5 rounded-full ${
                  isTestnet ? "bg-[var(--color-warn)]" : "bg-[var(--color-good)]"
                }`}
                aria-hidden="true"
              />
              <span className="label !text-[var(--color-mid)]">
                {activeChain.name} · {ACTIVE_CHAIN_ID}
              </span>
            </div>
          </div>

          {/* product */}
          <FooterColumn title="Product">
            <FooterLink href="/dashboard">Your vault</FooterLink>
            <FooterLink href="/activity">Decision log</FooterLink>
            <FooterLink href="/#study">How it works</FooterLink>
          </FooterColumn>

          {/* contracts */}
          <FooterColumn title="Contracts">
            {contracts.map(([label, addr]) =>
              addr ? (
                <a
                  key={label}
                  href={explorerAddress(addr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <span className="block text-[13px] text-[var(--color-mid)] transition-colors group-hover:text-[var(--color-ink)]">
                    {label}
                  </span>
                  <span className="tabular mt-0.5 block text-[11px] text-[var(--color-faint)] transition-colors group-hover:text-[var(--color-accent)]">
                    {addr.slice(0, 6)}…{addr.slice(-4)}
                  </span>
                </a>
              ) : (
                <div key={label}>
                  <span className="block text-[13px] text-[var(--color-mid)]">{label}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--color-faint)]">
                    not deployed
                  </span>
                </div>
              )
            )}
          </FooterColumn>

          {/* network */}
          <FooterColumn title="Network">
            <FooterExternal href={activeChain.blockExplorers.default.url}>
              Block explorer
            </FooterExternal>
            <FooterExternal href={activeChain.rpcUrls.default.http[0]}>
              RPC endpoint
            </FooterExternal>
            <FooterExternal href="https://dex.botchain.ai">BDEX</FooterExternal>
            {isTestnet && (
              <FooterExternal href="https://faucet.bohr.life/basic/">
                Testnet faucet
              </FooterExternal>
            )}
          </FooterColumn>
        </div>

        <div className="rule-fade my-10" />

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-[620px] text-[11.5px] leading-relaxed text-[var(--color-faint)]">
            Figures shown were measured from BDEX pool data on {MEASURED_ON}. Passive
            APR is fees divided by total pool liquidity, which is what a full-range
            position earns. Providing liquidity carries risk, including impermanent
            loss, which Curtis reduces and cannot remove. Past fee generation does not
            guarantee future returns, and nothing here is financial advice.
          </p>
          <p className="shrink-0 text-[11.5px] text-[var(--color-faint)]">
            Built for the BOT Chain Builder Challenge
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="label">{title}</h3>
      <div className="mt-5 space-y-3.5">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block text-[13px] text-[var(--color-mid)] transition-colors hover:text-[var(--color-ink)]"
    >
      {children}
    </Link>
  );
}

function FooterExternal({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-1.5 text-[13px] text-[var(--color-mid)] transition-colors hover:text-[var(--color-ink)]"
    >
      {children}
      <svg
        className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2.5 7.5 7.5 2.5M7.5 2.5H3.6M7.5 2.5v3.9"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
