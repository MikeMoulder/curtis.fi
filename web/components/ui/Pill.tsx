import type { ReactNode } from "react";

type Tone = "neutral" | "inrange" | "drifting" | "outrange" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "text-[var(--color-mid)] border-white/10 bg-white/[0.04]",
  inrange: "text-[var(--color-good)] border-[var(--color-good)]/25 bg-[var(--color-good)]/10",
  drifting:
    "text-[var(--color-warn)] border-[var(--color-warn)]/25 bg-[var(--color-warn)]/10",
  outrange:
    "text-[var(--color-bad)] border-[var(--color-bad)]/25 bg-[var(--color-bad)]/10",
  accent:
    "text-[var(--color-accent)] border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-[var(--color-lo)]",
  inrange: "bg-[var(--color-good)]",
  drifting: "bg-[var(--color-warn)]",
  outrange: "bg-[var(--color-bad)]",
  accent: "bg-[var(--color-accent)]",
};

interface PillProps {
  children: ReactNode;
  tone?: Tone;
  /** Show a status dot. Pulses for live/attention states. */
  dot?: boolean;
  pulse?: boolean;
}

export function Pill({ children, tone = "neutral", dot = false, pulse = false }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide ${TONES[tone]}`}
    >
      {dot && (
        <span
          className={`size-1.5 rounded-full ${DOTS[tone]} ${pulse ? "pulse-dot" : ""}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
