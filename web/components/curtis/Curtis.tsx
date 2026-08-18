"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Curtis.module.css";

export type CurtisState =
  | "idle"
  | "scanning"
  | "thinking"
  | "acting"
  | "success"
  | "alert";

interface CurtisProps {
  state?: CurtisState;
  /** Rendered size in px. */
  size?: number;
  /** Whether he reacts to clicks with a burst. */
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

interface Spark {
  id: number;
  sx: string;
  sy: string;
}

/**
 * Curtis.
 *
 * His state is driven by what the agent is actually doing, not by a timer —
 * `scanning` while polling the pool, `thinking` during a model call, `acting`
 * while a transaction is in flight. That coupling is the point: the character
 * is a status display people happen to like looking at, so it stays honest
 * even when it is charming.
 */
export function Curtis({
  state = "idle",
  size = 160,
  interactive = true,
  onClick,
  className = "",
}: CurtisProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [shocks, setShocks] = useState<number[]>([]);
  const seq = useRef(0);

  /* Eyes and specular track the cursor. Both are written straight to CSS
     custom properties inside a rAF, so pointer movement never triggers a React
     render, and this component sits on every screen so it must stay free. */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const el = rootRef.current;
        if (!el) return;

        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;

        const angle = Math.atan2(dy, dx);
        const dist = Math.hypot(dx, dy);

        // Pupils saturate quickly; the specular lags and moves less, which
        // reads as a distant light source rather than a second pair of eyes.
        const pupilMax = size * 0.028;
        const pupilR = Math.min(pupilMax, (dist / 220) * pupilMax);
        el.style.setProperty("--pupil-x", `${Math.cos(angle) * pupilR}px`);
        el.style.setProperty("--pupil-y", `${Math.sin(angle) * pupilR}px`);

        const specMax = size * 0.035;
        const specR = Math.min(specMax, (dist / 400) * specMax);
        el.style.setProperty("--spec-x", `${-Math.cos(angle) * specR}px`);
        el.style.setProperty("--spec-y", `${-Math.sin(angle) * specR}px`);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [size]);

  const burst = useCallback(() => {
    const n = 10;
    const made: Spark[] = Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const d = size * (0.42 + Math.random() * 0.22);
      seq.current += 1;
      return {
        id: seq.current,
        sx: `${Math.cos(a) * d}px`,
        sy: `${Math.sin(a) * d}px`,
      };
    });
    seq.current += 1;
    const shockId = seq.current;

    setSparks((s) => [...s, ...made]);
    setShocks((s) => [...s, shockId]);

    const ids = new Set(made.map((m) => m.id));
    window.setTimeout(() => {
      setSparks((s) => s.filter((x) => !ids.has(x.id)));
      setShocks((s) => s.filter((x) => x !== shockId));
    }, 950);
  }, [size]);

  /* Every transition into `acting` fires a burst, whether that came from a
     click or from the agent actually broadcasting a transaction. */
  const prevState = useRef(state);
  useEffect(() => {
    if (state === "acting" && prevState.current !== "acting") burst();
    prevState.current = state;
  }, [state, burst]);

  const handleClick = () => {
    if (!interactive) return;
    burst();
    onClick?.();
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${styles[`state-${state}`]} ${
        interactive ? styles.interactive : ""
      } ${className}`}
      style={{ ["--size" as string]: `${size}px` }}
      onClick={handleClick}
      role={interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : -1}
      aria-label={`Curtis, ${state}`}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.halo} />
      <div className={styles.haloTight} />

      <div className={styles.carriage}>
        <div className={`${styles.orbit} ${styles.orbitA}`}>
          <span className={styles.orbitDot} />
        </div>
        <div className={`${styles.orbit} ${styles.orbitB}`}>
          <span className={styles.orbitDot} />
        </div>

        <div className={styles.body}>
          <div className={styles.core} />
          <div className={styles.rimlight} />
          <div className={styles.scan} />
          <div className={styles.specular} />
          <div className={styles.specularTight} />

          <div className={styles.face}>
            <div className={styles.eye}>
              <span className={styles.pupil} />
            </div>
            <div className={styles.eye}>
              <span className={styles.pupil} />
            </div>
          </div>
        </div>

        {shocks.map((id) => (
          <span key={id} className={styles.shock} />
        ))}
        {sparks.map((s) => (
          <span
            key={s.id}
            className={styles.spark}
            style={{ ["--sx" as string]: s.sx, ["--sy" as string]: s.sy }}
          />
        ))}

        <div className={styles.ground} />
      </div>
    </div>
  );
}

/** Human-readable line for each state, used under the character. */
export const CURTIS_STATUS: Record<CurtisState, string> = {
  idle: "standing by",
  scanning: "reading pool state",
  thinking: "evaluating range",
  acting: "broadcasting transaction",
  success: "position confirmed",
  alert: "guardrail triggered",
};
