"use client";

import { useEffect, useRef, type ReactNode, type ElementType } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger within a group, in ms. */
  delay?: number;
  className?: string;
  as?: ElementType;
}

/**
 * Releases its children when they scroll into view.
 *
 * Deliberately an IntersectionObserver rather than a scroll listener: it costs
 * nothing when nothing is happening, and it fires once. Elements that never
 * enter the viewport simply stay hidden, so nothing animates off-screen.
 */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If the browser cannot observe, show the content rather than hiding it.
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.animationDelay = `${delay}ms`;
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}
