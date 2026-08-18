"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Curtis } from "@/components/curtis/Curtis";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { isTestnet, activeChain } from "@/lib/chains";

const NAV = [
  { href: "/dashboard", label: "Vault" },
  { href: "/activity", label: "Log" },
];

/**
 * Transparent over the hero, and only takes on a surface once the page has
 * scrolled — a bar that is always frosted crops the display type at the top of
 * the viewport, which is the first thing that makes a page feel boxed in.
 */
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? "border-b border-white/[0.06] bg-[rgb(6_7_9_/_0.72)] backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-[68px] max-w-[1240px] items-center gap-8 px-6">
          <Link href="/" className="group flex items-center gap-3">
            <Curtis size={26} interactive={false} state="idle" />
            <span className="display text-[21px] tracking-[-0.02em]">Curtis</span>
          </Link>

          <nav className="hidden items-center gap-7 sm:flex">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-[13px] transition-colors ${
                    active
                      ? "text-[var(--color-ink)]"
                      : "text-[var(--color-lo)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-1.5 left-0 h-px w-full bg-[var(--color-accent)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            {isTestnet && (
              <span className="label hidden md:inline">{activeChain.name}</span>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
