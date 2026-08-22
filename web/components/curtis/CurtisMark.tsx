import styles from "./CurtisMark.module.css";

export type CurtisState =
  | "idle"
  | "scanning"
  | "thinking"
  | "acting"
  | "success"
  | "alert";

interface Props {
  state?: CurtisState;
  /** Rendered size in px. The mark is square. */
  size?: number;
  className?: string;
  /** Renders a decorative mark rather than announcing state to a reader. */
  decorative?: boolean;
}

/**
 * CURTIS — the mark.
 *
 * The same character the dashboard shows at 130px, drawn small enough to sit
 * beside a wordmark: a floating sphere with two eyes that blink. That shape is
 * the product's face and people recognise it, so the mark is the character
 * rather than an abstract glyph standing in for it.
 *
 * What changed from the original is the palette, not the creature. Neon blue on
 * black is somebody else's aesthetic; here the sphere is drafting prussian on
 * film, with a hard contact shadow instead of a bloom. It reads as an object
 * resting on the sheet, which is the one thing every other element on the page
 * also does.
 *
 * Built from spans rather than SVG on purpose — no gradient `id` to collide
 * when the header and the footer both render one, no hook to make it a client
 * component, so the footer ships zero JavaScript for it.
 */
export function CurtisMark({
  state = "idle",
  size = 34,
  className = "",
  decorative = false,
}: Props) {
  return (
    <span
      className={`${styles.root} ${styles[state]} ${className}`}
      style={{ ["--mark" as string]: `${size}px` }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Curtis, ${STATUS[state]}`}
    >
      <span className={styles.orb}>
        <span className={styles.face}>
          <span className={styles.eye} />
          <span className={styles.eye} />
        </span>
      </span>
      <span className={styles.shadow} />
    </span>
  );
}

export const STATUS: Record<CurtisState, string> = {
  idle: "standing by",
  scanning: "reading pool state",
  thinking: "weighing the range",
  acting: "signing and broadcasting",
  success: "position confirmed",
  alert: "guardrail refused",
};

/** Legacy alias so existing call sites keep working during migration. */
export const CURTIS_STATUS = STATUS;
