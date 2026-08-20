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
    <Link href={`/livro/${book.slug}`} className={cx("group block", className)}>
      <div className="relative overflow-hidden">
        <div className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]">
          <BookCover book={book} priority={priority} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100" />
        <span className="pointer-events-none absolute bottom-2 left-2 text-[0.5625rem] uppercase tracking-[0.18em] text-white/80 opacity-0 transition-opacity duration-400 group-hover:opacity-100">
          {KIND_LABEL[book.kind]}
          {book.pages ? ` · ${book.pages} p.` : ""}
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        {index !== undefined ? (
          <span className="num shrink-0">{String(index + 1).padStart(2, "0")}</span>
        ) : null}
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[0.75rem] uppercase leading-[1.25] tracking-[0.08em] text-bone">
            {book.title}
          </h3>
          <p className="mt-1 truncate text-[0.625rem] uppercase tracking-[0.14em] text-dim">
            {book.authors[0]}
            {book.year ? ` · ${book.year}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
