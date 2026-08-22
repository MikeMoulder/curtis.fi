/**
 * The rule a section hangs from.
 *
 * Three sections had each invented their own version of this — same heading
 * clamp, same heavy rule, three slightly different paddings and two different
 * ways of placing the aside. On a page whose whole claim is that it was drawn
 * to a standard, that inconsistency is the thing a reader feels as noise
 * without being able to name it.
 */
export function SectionRule({
  title,
  aside,
  level = "h2",
}: {
  title: string;
  aside?: string;
  /** h2 for a section, h3 for a block inside one. */
  level?: "h2" | "h3";
}) {
  const Heading = level;
  const size =
    level === "h2"
      ? "text-[clamp(21px,2.4vw,30px)]"
      : "text-[clamp(17px,1.6vw,21px)]";

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-[var(--color-ink)] pb-3">
      <Heading className={`head ${size}`}>{title}</Heading>
      {aside && <span className="label">{aside}</span>}
    </div>
  );
}
