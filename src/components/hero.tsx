import Link from "next/link";
import { ArrowRight, BookOpen, Download } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

export function Hero({ book, total }: { book: Book; total: number }) {
  const specs = [
    { label: "Formato", value: KIND_LABEL[book.kind] },
    { label: "Área", value: book.discipline },
    { label: "Ano", value: book.year ? String(book.year) : "—" },
    { label: "Páginas", value: book.pages ? String(book.pages) : "—" },
    { label: "Arquivo", value: formatBytes(book.fileSize) },
  ];

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      {/* The artwork itself lights the page, MUBI-style, behind a heavy scrim. */}
      {book.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-30 h-full w-full scale-110 object-cover opacity-45 blur-3xl"
        />
      ) : null}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background: book.coverUrl
            ? "linear-gradient(180deg, rgba(8,9,10,0.72) 0%, rgba(8,9,10,0.88) 60%, #08090a 100%)"
            : `radial-gradient(65% 60% at 76% 0%, ${book.accent}8c 0%, ${book.accent}26 45%, transparent 74%), linear-gradient(180deg,#0b0c0e,#08090a)`,
        }}
      />

      <div className="shell pt-[var(--header)]">
        <div className="flex items-center gap-3 border-b border-line py-3">
          <span className="num">001</span>
          <span className="label">Destaque da semana</span>
          <span className="ml-auto hidden text-[0.625rem] uppercase tracking-[0.2em] text-dim sm:block">
            {book.publisher ?? "Acervo"}
          </span>
        </div>

        <div className="grid gap-8 py-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-16">
          <div className="rise flex flex-col">
            <h1 className="display max-w-[15ch] text-[clamp(2.25rem,4.6vw,3.75rem)]">
              {book.title}
            </h1>

            {book.subtitle ? (
              <p className="mt-4 max-w-md text-[0.9375rem] leading-snug text-[#b9bbbe]">
                {book.subtitle}
              </p>
            ) : null}

            <p className="label label-bone mt-5">{book.authors.join(", ")}</p>

            {book.description ? (
              <p className="prose-sm mt-5 max-w-md">{book.description}</p>
            ) : null}

            <div className="mt-auto flex flex-wrap items-center gap-2 pt-8">
              <Link href={`/livro/${book.slug}/ler`} className="btn btn-solid">
                <BookOpen className="h-3.5 w-3.5" strokeWidth={1.6} />
                Ler agora
              </Link>
              <a href={`/api/arquivo/${book.fileKey}?download`} className="btn btn-ghost">
                <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
                Baixar
              </a>
              <Link
                href="/acervo"
                className="underline-grow ml-2 inline-flex items-center gap-1.5 text-[0.625rem] uppercase tracking-[0.2em] text-muted hover:text-bone"
              >
                {total} títulos
                <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          <figure className="rise mx-auto w-[52%] max-w-[13rem] lg:mx-0 lg:w-full lg:max-w-none">
            <Link href={`/livro/${book.slug}`} className="block">
              <BookCover
                book={book}
                priority
                className="shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] transition-transform duration-500 hover:-translate-y-1"
              />
            </Link>

            <dl className="mt-4 border-t border-line">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-3 border-b border-line py-1.5"
                >
                  <dt className="label">{spec.label}</dt>
                  <dd className="text-right text-[0.6875rem] uppercase tracking-[0.06em] text-bone">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </figure>
        </div>
      </div>
    </section>
  );
}
