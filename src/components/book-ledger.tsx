"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";

type Peek = { book: Book; x: number; y: number } | null;

/** The catalogue read as an index: hairline rows, cover peeking on hover. */
export function BookLedger({ books }: { books: Book[] }) {
  const [peek, setPeek] = useState<Peek>(null);

  return (
    <div className="relative">
      <div className="ledger-row !border-t-0 pb-2 pt-0">
        <span className="num">Nº</span>
        <span className="label">Título</span>
        <span className="label ledger-hide">Autoria</span>
        <span className="label ledger-hide">Área</span>
        <span className="label text-right">Ano</span>
      </div>

      {books.map((book, index) => (
        <Link
          key={book.id}
          href={`/livro/${book.slug}`}
          className="ledger-row group text-muted hover:text-bone"
          onMouseMove={(event) =>
            setPeek({ book, x: event.clientX, y: event.clientY })
          }
          onMouseLeave={() => setPeek(null)}
        >
          <span className="num group-hover:text-bone">
            {String(index + 1).padStart(3, "0")}
          </span>

          <span className="min-w-0">
            <span className="block truncate text-[0.8125rem] text-bone">{book.title}</span>
            <span className="mt-0.5 block truncate text-[0.625rem] uppercase tracking-[0.14em] text-dim">
              {KIND_LABEL[book.kind]}
              {book.pages ? ` · ${book.pages} p.` : ""}
            </span>
          </span>

          <span className="ledger-hide truncate text-[0.6875rem] uppercase tracking-[0.1em]">
            {book.authors.join(", ")}
          </span>

          <span className="ledger-hide truncate text-[0.625rem] uppercase tracking-[0.16em]">
            {book.discipline}
          </span>

          <span className="text-right text-[0.6875rem] tabular-nums">{book.year ?? "—"}</span>
        </Link>
      ))}

      {peek ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-40 hidden w-28 md:block"
          style={{
            left: Math.min(peek.x + 24, (globalThis.innerWidth ?? 1200) - 140),
            top: Math.min(peek.y - 90, (globalThis.innerHeight ?? 800) - 190),
          }}
        >
          <BookCover
            book={peek.book}
            className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)]"
          />
        </div>
      ) : null}
    </div>
  );
}
