import type { Book } from "@/lib/types";
import { cx } from "@/lib/utils";

function shade(hex: string, amount: number) {
  const value = hex.replace("#", "");
  const rgb = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  const mixed = rgb.map((channel) =>
    Math.max(0, Math.min(255, Math.round(channel + amount))),
  );
  return `rgb(${mixed.join(",")})`;
}

/**
 * Books rarely arrive with artwork, so the fallback is a typographic cover that
 * reads as a designed object rather than a placeholder.
 */
export function BookCover({
  book,
  className,
  priority,
}: {
  book: Book;
  className?: string;
  priority?: boolean;
}) {
  // Open Library artwork wins; the rendered first page is the fallback.
  const artwork = book.coverUrl ?? (book.coverKey ? `/api/arquivo/${book.coverKey}` : null);

  return (
    <div
      className={cx(
        "relative isolate aspect-[2/3] w-full overflow-hidden rounded-[3px] bg-ink-3",
        className,
      )}
      style={{ containerType: "inline-size" }}
    >
      {artwork ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artwork}
          alt={`Capa de ${book.title}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full flex-col"
          style={{
            padding: "7cqw",
            background: `linear-gradient(155deg, ${shade(book.accent, 26)} 0%, ${book.accent} 46%, ${shade(book.accent, -34)} 100%)`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 70% at 18% 6%, rgba(255,255,255,0.22), transparent 58%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0"
            style={{
              width: "6.5cqw",
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.42), rgba(0,0,0,0.05) 62%, rgba(255,255,255,0.14))",
            }}
          />

          <div className="relative flex items-center justify-between text-white/70">
            <span
              style={{ fontSize: "2.9cqw", letterSpacing: "0.22em" }}
              className="uppercase"
            >
              {book.publisher ?? "Acervo"}
            </span>
            <span style={{ fontSize: "2.9cqw" }} className="tabular-nums text-white/55">
              {book.year ?? ""}
            </span>
          </div>

          <div className="relative mt-auto">
            <div
              className="mb-[5cqw] bg-white/45"
              style={{ height: "1px", width: "18%" }}
            />
            <p
              className="font-display text-white"
              style={{ fontSize: "10.5cqw", lineHeight: 0.95 }}
            >
              {book.title}
            </p>
            {book.subtitle ? (
              <p
                className="mt-[3cqw] text-white/65"
                style={{ fontSize: "3.6cqw", lineHeight: 1.35 }}
              >
                {book.subtitle}
              </p>
            ) : null}
          </div>

          <div className="relative mt-[8cqw] flex items-end justify-between gap-[4cqw]">
            <p
              className="uppercase text-white/75"
              style={{ fontSize: "2.9cqw", letterSpacing: "0.16em" }}
            >
              {book.authors[0]}
              {book.authors.length > 1 ? " e outros" : ""}
            </p>
            <span
              className="shrink-0 uppercase text-white/45"
              style={{ fontSize: "2.4cqw", letterSpacing: "0.2em" }}
            >
              Silo
            </span>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 rounded-[3px] ring-1 ring-inset ring-white/10" />
    </div>
  );
}
