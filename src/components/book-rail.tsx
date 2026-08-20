"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BookCard } from "@/components/book-card";
import type { Book } from "@/lib/types";
import { cx } from "@/lib/utils";

export function BookRail({
  title,
  description,
  books,
  href,
}: {
  title: string;
  description?: string;
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
    node.scrollBy({ left: direction * Math.max(node.clientWidth * 0.8, 280) });
  };

  if (books.length === 0) return null;

  return (
    <section className="py-14">
      <div className="shell mb-8 flex items-end justify-between gap-6">
        <div>
          <h2 className="font-display text-[2rem] leading-none md:text-[2.5rem]">{title}</h2>
          {description ? (
            <p className="mt-3 max-w-xl text-sm text-muted">{description}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {href ? (
            <Link
              href={href}
              className="link-underline hidden text-[0.75rem] uppercase tracking-[0.18em] text-muted hover:text-bone md:block"
            >
              Ver tudo
            </Link>
          ) : null}
          <div className="hidden items-center gap-2 md:flex">
            {([-1, 1] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                onClick={() => nudge(direction)}
                aria-label={direction === -1 ? "Anterior" : "Próximo"}
                disabled={direction === -1 ? edges.start : edges.end}
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-full border border-line transition-all",
                  "hover:border-bone hover:bg-white/5 disabled:pointer-events-none disabled:opacity-25",
                )}
              >
                {direction === -1 ? (
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={measure}
        className="rail shell pb-2"
        style={{ scrollPaddingInline: "1.25rem" }}
      >
        {books.map((book, index) => (
          <BookCard
            key={book.id}
            book={book}
            index={index}
            className="w-[62vw] shrink-0 sm:w-[38vw] md:w-[26vw] lg:w-[17.5vw] xl:w-[15vw]"
          />
        ))}
      </div>
    </section>
  );
}
