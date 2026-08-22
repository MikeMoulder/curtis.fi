"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CurtisMark } from "@/components/curtis/CurtisMark";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { activeChain, ACTIVE_CHAIN_ID, isTestnet } from "@/lib/chains";

const NAV = [
  { href: "/dashboard", label: "Vault" },
  { href: "/activity", label: "Log" },
];

/**
 * The top edge of the sheet.
 *
 * Opaque and ruled from the first pixel rather than fading in on scroll: a
 * drawing has a border, and a border that appears only once you move is a
 * webpage affectation. Nothing here floats.
 */
export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--hair-2)] bg-[var(--color-film)]">
      <div className="sheet flex h-14 items-center gap-7">
        <Link href="/" className="flex items-center gap-2.5">
          <CurtisMark size={30} state="idle" decorative />
          <span
            className="text-[15px] tracking-[0.16em] uppercase"
            style={{
              fontFamily: "var(--font-display)",
              fontVariationSettings: '"wdth" 112',
              fontWeight: 700,
            }}
          >
            Curtis
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`label transition-colors ${
                  active
                    ? "!text-[var(--color-oxide)]"
                    : "hover:!text-[var(--color-ink)]"
                }`}
              >
                {item.label}
                {active && (
                  <span className="mt-1.5 block h-[1.5px] w-full bg-[var(--color-oxide)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-5">
          {/* Which chain you are actually on. On a two-network product with a
              token that changes decimals between them, this is safety
              information, not chrome. */}
          <span className="hidden items-center gap-2 md:flex">
            <span
              className={`pulse size-[5px] shrink-0 ${
                isTestnet ? "bg-[var(--color-arc-amber)]" : "bg-[var(--color-arc-green)]"
              }`}
              aria-hidden="true"
            />
            <span className="label">
              {isTestnet ? "Bohr" : "BOT Chain"} · {ACTIVE_CHAIN_ID}
            </span>
            <span className="sr-only">{activeChain.name}</span>
          </span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
