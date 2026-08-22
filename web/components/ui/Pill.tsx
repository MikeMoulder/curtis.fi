import type { ReactNode } from "react";

type Tone = "neutral" | "inrange" | "drifting" | "outrange" | "accent";

/**
 * A stamped status tag.
 *
 * The previous version was a translucent white pill, which on the film left
 * only the text visible and the border gone. Here each tone is a hairline box
 * with a faint wash of its own ink — legible on film, and square, so it sits in
 * the drawing rather than on it.
 *
 * Colour is never the only carrier. Callers pass a word, and the dot repeats it
 * — a reader who cannot separate the green from the amber still reads
 * "in range" or "drifting".
 */
/* `.label` is unlayered CSS and Tailwind's utilities are layered, so a plain
   `text-[…]` loses to the class's own colour. The bangs are required, not
   defensive. */
const TONES: Record<Tone, string> = {
  neutral: "!text-[var(--color-ink-3)] border-[var(--hair-2)] bg-[var(--color-film-3)]",
  inrange:
    "!text-[var(--color-arc-green)] border-[var(--color-arc-green)]/35 bg-[var(--color-arc-green)]/8",
  drifting:
    "!text-[var(--color-arc-amber)] border-[var(--color-arc-amber)]/35 bg-[var(--color-arc-amber)]/8",
  outrange: "!text-[var(--color-oxide)] border-[var(--color-oxide)]/40 bg-[var(--color-oxide-bg)]",
  accent:
    "!text-[var(--color-prussian)] border-[var(--color-prussian)]/35 bg-[var(--color-prussian)]/8",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-[var(--color-ink-4)]",
  inrange: "bg-[var(--color-arc-green)]",
  drifting: "bg-[var(--color-arc-amber)]",
  outrange: "bg-[var(--color-oxide)]",
  accent: "bg-[var(--color-prussian)]",
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
      className={`label inline-flex items-center gap-2 border px-2.5 py-[5px] !leading-none ${TONES[tone]}`}
    >
      {dot && (
        /* `pulse-dot` was the class name here, and no such rule exists — the
           prop has been silently doing nothing. The sheet's animation is
           `pulse`. */
        <span
          className={`size-[5px] shrink-0 ${DOTS[tone]} ${pulse ? "pulse" : ""}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
