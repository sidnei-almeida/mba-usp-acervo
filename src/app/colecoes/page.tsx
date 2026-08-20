import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { disciplinesOf, listBooks } from "@/lib/catalog";
import { KIND_LABEL, KINDS } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coleções",
  description: "As áreas do MBA USP/Esalq, organizadas em coleções navegáveis.",
};

export default async function CollectionsPage() {
  const books = await listBooks();
  const disciplines = disciplinesOf(books);

  return (
    <div className="pt-[4.5rem]">
      <section className="shell pb-14 pt-16 md:pt-24">
        <p className="eyebrow">Coleções</p>
        <h1 className="display mt-5 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)]">
          O curso inteiro, em prateleiras.
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
          Cada área reúne o que as turmas consideraram essencial — do livro-texto
          ao caso discutido em sala.
        </p>
      </section>

      <section className="shell space-y-px border-y border-line bg-line">
        {disciplines.map((discipline) => {
          const items = books.filter((book) => book.discipline === discipline.name);
          return (
            <Link
              key={discipline.name}
              href={`/acervo?disciplina=${encodeURIComponent(discipline.name)}`}
              className="group grid gap-6 bg-ink px-1 py-9 transition-colors hover:bg-ink-2 md:grid-cols-[1fr_auto] md:items-center md:px-6"
            >
              <div>
                <div className="flex items-center gap-4">
                  <h2 className="font-display text-[clamp(1.75rem,3.4vw,2.75rem)] leading-none">
                    {discipline.name}
                  </h2>
                  <ArrowUpRight
                    className="h-5 w-5 text-muted transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-bone"
                    strokeWidth={1.4}
                  />
                </div>
                <p className="mt-3 text-[0.6875rem] uppercase tracking-[0.2em] text-muted">
                  {discipline.count} {discipline.count === 1 ? "título" : "títulos"} ·{" "}
                  {items.slice(0, 3).map((book) => book.authors[0]).join(" · ")}
                </p>
              </div>

              <div className="flex -space-x-8 md:justify-end">
                {items.slice(0, 4).map((book, index) => (
                  <div
                    key={book.id}
                    className="w-16 shrink-0 transition-transform duration-500 group-hover:-translate-y-1.5"
                    style={{ zIndex: 4 - index, transitionDelay: `${index * 40}ms` }}
                  >
                    <BookCover book={book} className="shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]" />
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="shell py-20">
        <p className="eyebrow">Por formato</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {KINDS.map((kind) => (
            <Link key={kind} href={`/acervo?tipo=${kind}`} className="chip h-11 px-5 text-sm">
              {KIND_LABEL[kind]}
              <span className="opacity-50">
                {books.filter((book) => book.kind === kind).length}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
