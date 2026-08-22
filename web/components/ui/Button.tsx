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
 * A stamped control, not a pill.
 *
 * This was written for the previous dark theme: white-on-void with a glow, and
 * a `hover:bg-white` that on the film turned the primary action invisible at
 * the moment of clicking it. It is now the same square ink block the home page
 * had been hand-rolling for its own CTAs — hover goes to oxide, the one colour
 * on the sheet that means "this is live" — so there is a single button in the
 * product rather than one per page.
 *
 * Square corners are load-bearing: nothing on a drawing has a radius it was not
 * dimensioned for, and a rounded pill next to a ruled plate reads as a widget
 * that wandered in from another application.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-ink)] text-[var(--color-film)] border-[var(--color-ink)] " +
    "hover:bg-[var(--color-oxide)] hover:border-[var(--color-oxide)]",
  ghost:
    "bg-transparent text-[var(--color-ink-2)] border-[var(--hair-2)] " +
    "hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] hover:bg-[var(--color-film-3)]",
  danger:
    "bg-transparent text-[var(--color-oxide)] border-[var(--color-oxide)]/45 " +
    "hover:bg-[var(--color-oxide)] hover:text-[var(--color-film)] hover:border-[var(--color-oxide)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[11px] gap-1.5",
  md: "h-10 px-5 text-[12px] gap-2",
  lg: "h-11 px-6 text-[12.5px] gap-2.5",
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
      style={{ fontFamily: "var(--font-meter)", ...rest.style }}
      className={`
        inline-flex items-center justify-center border tracking-[0.14em] uppercase
        transition-colors duration-300
        active:translate-y-px
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
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.6" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
