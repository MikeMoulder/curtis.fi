"use client";

import { useState } from "react";
import { explorerAddress, explorerTx } from "@/lib/chains";

export function shortAddress(addr: string, chars = 4): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

interface AddressProps {
  value: string;
  kind?: "address" | "tx";
  /** Show a copy control. */
  copyable?: boolean;
  chars?: number;
  className?: string;
}

/**
 * A hash, rendered so it can be verified. Always links out to the explorer —
 * a link to a chain explorer nobody controls is the only convincing evidence
 * that anything on this page actually happened.
 */
export function Address({
  value,
  kind = "address",
  copyable = true,
  chars = 4,
  className = "",
}: AddressProps) {
  const [copied, setCopied] = useState(false);
  const href = kind === "tx" ? explorerTx(value) : explorerAddress(value);

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — the link still works, so fail quietly */
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="tabular text-[12px] text-[var(--color-mid)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] hover:underline"
        title={value}
      >
        {shortAddress(value, chars)}
      </a>
      {copyable && (
        <button
          onClick={copy}
          className="text-[var(--color-faint)] transition-colors hover:text-[var(--color-mid)]"
          aria-label={copied ? "Copied" : "Copy to clipboard"}
        >
          {copied ? (
            <svg className="size-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2.5 6.2 4.8 8.5 9.5 3.8"
                stroke="var(--color-good)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg className="size-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M8 4V2.9c0-.8-.6-1.4-1.4-1.4H2.9c-.8 0-1.4.6-1.4 1.4v3.7c0 .8.6 1.4 1.4 1.4H4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      )}
    </span>
  );
}
