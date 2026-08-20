"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BookCard } from "@/components/book-card";
import type { Book } from "@/lib/types";
import { cx } from "@/lib/utils";

export function BookRail({
  title,
  index,
  books,
  href,
}: {
  title: string;
  index?: string;
  books: Book[];
  href?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const node = railRef.current;
    if (!node) return;
    setEdges({
      start: node.scrollLeft < 8,
      end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const nudge = (direction: 1 | -1) => {
    const node = railRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(node.clientWidth * 0.7, 240) });
  };

  if (books.length === 0) return null;

  return (
    <section className="py-8">
      <div className="shell mb-4 flex items-center justify-between gap-6 border-b border-line pb-2.5">
        <div className="flex items-baseline gap-3">
          {index ? <span className="num">{index}</span> : null}
          <h2 className="text-[0.6875rem] uppercase tracking-[0.2em] text-bone">{title}</h2>
          <span className="num">{String(books.length).padStart(2, "0")}</span>
        </div>

        <div className="flex items-center gap-4">
          {href ? (
            <Link
              href={href}
              className="underline-grow hidden text-[0.625rem] uppercase tracking-[0.2em] text-muted hover:text-bone md:block"
            >
              Ver tudo
            </Link>
          ) : null}
          <div className="hidden items-center gap-1 md:flex">
            {([-1, 1] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                onClick={() => nudge(direction)}
                aria-label={direction === -1 ? "Anterior" : "Próximo"}
                disabled={direction === -1 ? edges.start : edges.end}
                className={cx(
                  "grid h-7 w-7 place-items-center border border-line transition-colors",
                  "hover:border-white/45 disabled:pointer-events-none disabled:opacity-20",
                )}
              >
                {direction === -1 ? (
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.4} />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.4} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={railRef} onScroll={measure} className="rail shell pb-1">
        {books.map((book, position) => (
          <BookCard
            key={book.id}
            book={book}
            index={position}
            className="w-[38vw] shrink-0 sm:w-[24vw] md:w-[17vw] lg:w-[12.5vw] xl:w-[10.5vw]"
          />
        ))}
      </div>
    </section>
  );
}
