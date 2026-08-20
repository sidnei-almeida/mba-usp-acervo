import Link from "next/link";

/** Slow ticker of the shelves — a printed spine running across the page. */
export function Marquee({ items }: { items: { name: string; count: number }[] }) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-line py-2.5">
      <div className="marquee-track">
        {loop.map((item, index) => (
          <Link
            key={`${item.name}-${index}`}
            href={`/acervo?disciplina=${encodeURIComponent(item.name)}`}
            className="flex items-baseline gap-2 text-[0.625rem] uppercase tracking-[0.24em] text-muted transition-colors hover:text-bone"
          >
            {item.name}
            <span className="num">{String(item.count).padStart(2, "0")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
