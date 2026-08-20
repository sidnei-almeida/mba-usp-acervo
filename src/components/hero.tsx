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
    <section className="relative isolate overflow-hidden border-b border-line pt-[var(--header)]">
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background: `radial-gradient(70% 60% at 72% 0%, ${book.accent}8c 0%, ${book.accent}26 42%, transparent 72%), linear-gradient(180deg,#0b0c0e,#08090a)`,
        }}
      />

      <div className="shell grid gap-8 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_11rem_15rem] lg:items-end lg:gap-10">
        <div className="rise">
          <div className="flex items-center gap-3">
            <span className="num">001</span>
            <span className="h-px w-8 bg-line" />
            <span className="label">Destaque da semana</span>
          </div>

          <h1 className="display mt-5 max-w-[16ch] text-[clamp(2rem,4.4vw,3.5rem)]">
            {book.title}
          </h1>

          {book.subtitle ? (
            <p className="mt-3 max-w-md text-[0.9375rem] leading-snug text-[#b9bbbe]">
              {book.subtitle}
            </p>
          ) : null}

          <p className="label label-bone mt-4">{book.authors.join(", ")}</p>

          {book.description ? (
            <p className="prose-sm mt-5 max-w-md">{book.description}</p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-2">
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

        <dl className="rise hidden self-end border-l border-line pl-6 lg:block">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-b-0"
            >
              <dt className="label">{spec.label}</dt>
              <dd className="text-[0.6875rem] uppercase tracking-[0.08em] text-bone">
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>

        <figure className="rise mx-auto w-[45%] max-w-[13rem] lg:mx-0 lg:w-full lg:max-w-none">
          <Link href={`/livro/${book.slug}`} className="block">
            <BookCover
              book={book}
              priority
              className="shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] transition-transform duration-500 hover:-translate-y-1"
            />
          </Link>
          <figcaption className="mt-2.5 flex items-baseline justify-between border-t border-line pt-2">
            <span className="num">fig. 01</span>
            <span className="label">{book.publisher ?? "Acervo"}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
