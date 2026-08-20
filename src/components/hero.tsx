import Link from "next/link";
import { ArrowRight, BookOpen, Download } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

export function Hero({ book, total }: { book: Book; total: number }) {
  const meta = [
    KIND_LABEL[book.kind],
    book.year ? String(book.year) : null,
    book.pages ? `${book.pages} páginas` : null,
    formatBytes(book.fileSize),
  ].filter(Boolean);

  return (
    <section className="relative isolate min-h-[86svh] overflow-hidden pt-[4.5rem]">
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background: `radial-gradient(85% 65% at 74% 6%, ${book.accent}a6 0%, ${book.accent}33 42%, transparent 70%), radial-gradient(55% 55% at 6% 92%, rgba(18,62,134,0.22), transparent 70%), linear-gradient(180deg, #0b0c0e 0%, #08090a 100%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/20"
      />

      <div className="shell grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <div className="rise max-w-2xl">
          <p className="eyebrow">Destaque da semana</p>

          <h1 className="display mt-6 text-[clamp(2.75rem,7vw,5.25rem)]">
            {book.title}
          </h1>

          {book.subtitle ? (
            <p className="mt-5 max-w-lg text-lg leading-snug text-[#cfccc6] md:text-xl">
              {book.subtitle}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.75rem] uppercase tracking-[0.16em] text-muted">
            <span className="text-bone">{book.authors.join(", ")}</span>
            {meta.map((item) => (
              <span key={item} className="flex items-center gap-3">
                <span className="h-1 w-1 rounded-full bg-white/30" />
                {item}
              </span>
            ))}
          </div>

          {book.description ? (
            <p className="mt-8 max-w-xl text-[0.9375rem] leading-relaxed text-[#b9b7b2]">
              {book.description}
            </p>
          ) : null}

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href={`/livro/${book.slug}/ler`} className="btn btn-solid">
              <BookOpen className="h-4 w-4" strokeWidth={1.6} />
              Ler agora
            </Link>
            <a
              href={`/api/arquivo/${book.fileKey}?download`}
              className="btn btn-ghost"
            >
              <Download className="h-4 w-4" strokeWidth={1.6} />
              Baixar PDF
            </a>
            <Link
              href="/acervo"
              className="link-underline ml-2 inline-flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.18em] text-muted hover:text-bone"
            >
              {total} títulos no acervo
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <div className="rise relative mx-auto w-[62%] max-w-[20rem] lg:w-full lg:max-w-[24rem]" style={{ animationDelay: "160ms" }}>
          <div
            aria-hidden
            className="absolute -inset-10 -z-10 blur-3xl"
            style={{ background: `${book.accent}55` }}
          />
          <Link href={`/livro/${book.slug}`} className="block">
            <BookCover
              book={book}
              priority
              className="shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] transition-transform duration-700 hover:-translate-y-2"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
