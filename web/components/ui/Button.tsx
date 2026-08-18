"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

/**
 * The primary action is ink-on-void rather than a saturated blue.
 *
 * On a near-monochrome page a white pill is the highest-contrast thing
 * available, so it draws the eye without spending the accent colour — which is
 * reserved for live data. Saturated blue buttons are also the single most
 * generic signal a crypto front end can send.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-ink)] text-[var(--color-void)] border-transparent " +
    "hover:bg-white shadow-[0_10px_30px_-12px_rgba(255,255,255,0.35)]",
  ghost:
    "bg-white/[0.045] text-[var(--color-ink)] border-white/10 " +
    "hover:bg-white/[0.085] hover:border-white/20 " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
  danger:
    "bg-transparent text-[var(--color-bad)] border-[var(--color-bad)]/30 " +
    "hover:bg-[var(--color-bad)]/10 hover:border-[var(--color-bad)]/60",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[12px] gap-1.5",
  md: "h-10 px-5 text-[13px] gap-2",
  lg: "h-12 px-7 text-[13.5px] gap-2.5",
};

export function Button({
  variant = "ghost",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center rounded-full border font-medium
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        active:scale-[0.98]
        disabled:pointer-events-none disabled:opacity-40
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="size-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
