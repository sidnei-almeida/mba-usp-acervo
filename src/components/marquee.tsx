import Link from "next/link";
import { cx } from "@/lib/utils";

function Track({
  items,
  hidden,
}: {
  items: { name: string; count: number }[];
  hidden?: boolean;
}) {
  return (
    <div
      aria-hidden={hidden}
      className="marquee-track flex min-w-full shrink-0 items-center justify-around gap-12"
    >
      {items.map((item) => (
        <Link
          key={item.name}
          href={`/acervo?disciplina=${encodeURIComponent(item.name)}`}
          tabIndex={hidden ? -1 : undefined}
          className="flex shrink-0 items-baseline gap-2 whitespace-nowrap text-[0.625rem] uppercase tracking-[0.24em] text-muted transition-colors hover:text-bone"
        >
          {item.name}
          <span className="num">{String(item.count).padStart(2, "0")}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * Slow ticker of the shelves. Two identical tracks, each at least as wide as
 * the viewport, slide together: when the first leaves, the second is already
 * in its place, so the band never shows a gap.
 */
export function Marquee({ items }: { items: { name: string; count: number }[] }) {
  if (items.length === 0) return null;

  return (
    <div className={cx("flex overflow-hidden border-y border-line py-2.5")}>
      <Track items={items} />
      <Track items={items} hidden />
    </div>
  );
}
