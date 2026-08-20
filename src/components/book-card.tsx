import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";
import { cx } from "@/lib/utils";

export function BookCard({
  book,
  className,
  priority,
  index,
}: {
  book: Book;
  className?: string;
  priority?: boolean;
  index?: number;
}) {
  return (
    <Link
      href={`/livro/${book.slug}`}
      className={cx("group block", className)}
      style={index !== undefined ? { animationDelay: `${Math.min(index, 12) * 40}ms` } : undefined}
    >
      <div className="relative overflow-hidden rounded-[3px]">
        <div className="transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]">
          <BookCover book={book} priority={priority} />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-white/70">
            {KIND_LABEL[book.kind]}
            {book.pages ? ` · ${book.pages} pág.` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[0.625rem] uppercase tracking-[0.2em] text-muted">
          {book.discipline}
        </p>
        <h3 className="mt-2 font-display text-[1.375rem] leading-[1.1] text-bone transition-colors group-hover:text-white">
          {book.title}
        </h3>
        <p className="mt-1.5 text-[0.8125rem] text-muted">
          {book.authors.join(", ")}
          {book.year ? ` · ${book.year}` : ""}
        </p>
      </div>
    </Link>
  );
}
