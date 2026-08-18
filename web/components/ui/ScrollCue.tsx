"use client";

import { useEffect, useState } from "react";

/**
 * The cue at the base of the hero.
 *
 * A light travels down a hairline instead of an icon bouncing. The motion reads
 * as direction without the arrow itself having to move much, which keeps it
 * quiet enough to sit under a headline rather than competing with it.
 *
 * It fades out as soon as the reader starts scrolling, because an indicator
 * still telling you to scroll once you already are is noise.
 */
export function ScrollCue({ targetId = "study" }: { targetId?: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      onClick={go}
      aria-label="Scroll to see how it works"
      className={`group flex flex-col items-center gap-3 transition-opacity duration-500 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <span className="label transition-colors group-hover:!text-[var(--color-mid)]">
        Scroll
      </span>

      {/* the hairline, with a light running down it */}
      <span className="relative block h-14 w-px overflow-hidden bg-gradient-to-b from-transparent via-white/15 to-transparent">
        <span
          className="absolute inset-x-0 top-0 block h-5 rounded-full"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--color-accent), transparent)",
            animation: "cue-travel 2.6s cubic-bezier(0.65, 0, 0.35, 1) infinite",
          }}
        />
      </span>

      <svg
        className="size-3 text-[var(--color-lo)] transition-colors group-hover:text-[var(--color-accent)]"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
        style={{ animation: "cue-nudge 2.6s cubic-bezier(0.65, 0, 0.35, 1) infinite" }}
      >
        <path
          d="M2.5 4.5 6 8l3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
