import { Suspense } from "react";
import type { Metadata } from "next";
import { BookCard } from "@/components/book-card";
import { BookLedger } from "@/components/book-ledger";
import { CatalogFilters } from "@/components/catalog-filters";
import { disciplinesOf, filterBooks, listBooks } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acervo completo",
  description: "Todos os livros, apostilas, casos e artigos do MBA USP/Esalq.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogPage({ searchParams }: PageProps<"/acervo">) {
  const params = await searchParams;
  const books = await listBooks();

  const query = {
    q: first(params.q),
    discipline: first(params.disciplina),
    kind: first(params.tipo),
    sort: first(params.ordem) as "recentes" | "titulo" | "populares" | "ano" | undefined,
  };
  const result = filterBooks(books, query);
  const view = first(params.vista) === "indice" ? "indice" : "grade";

  return (
    <div className="pt-[var(--header)]">
      <section className="shell pt-10">
        <div className="flex items-baseline gap-3">
          <span className="num">A—Z</span>
          <span className="label">Acervo completo</span>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <h1 className="display text-[clamp(1.75rem,4vw,3rem)]">
            {query.discipline ?? "Tudo o que a turma compartilhou"}
          </h1>
          <p className="label">
            {String(result.length).padStart(2, "0")}{" "}
            {result.length === 1 ? "título" : "títulos"}
            {books.length !== result.length ? ` de ${books.length}` : ""}
          </p>
        </div>
      </section>

      <section className="shell py-5">
        <Suspense fallback={<div className="h-28" />}>
          <CatalogFilters
            disciplines={disciplinesOf(books)}
            autoFocus={first(params.foco) === "busca"}
          />
        </Suspense>
      </section>

      <section className="shell pb-16">
        {result.length === 0 ? (
          <div className="border-t border-line py-16 text-center">
            <p className="display text-2xl">Nada por aqui ainda.</p>
            <p className="prose-sm mt-3">
              Ajuste os filtros ou envie o primeiro título dessa área.
            </p>
          </div>
        ) : view === "indice" ? (
          <BookLedger books={result} />
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-7 border-t border-line pt-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
            {result.map((book, index) => (
              <BookCard key={book.id} book={book} index={index} className="rise" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
