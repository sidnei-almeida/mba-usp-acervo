import { Suspense } from "react";
import type { Metadata } from "next";
import { BookCard } from "@/components/book-card";
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

  return (
    <div className="pt-[4.5rem]">
      <section className="shell pb-10 pt-16 md:pt-24">
        <p className="eyebrow">Acervo completo</p>
        <h1 className="display mt-5 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)]">
          {query.discipline ?? "Tudo o que a turma já compartilhou"}
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
          {result.length} {result.length === 1 ? "título encontrado" : "títulos encontrados"}
          {books.length !== result.length ? ` de ${books.length} no acervo` : ""}.
        </p>
      </section>

      <section className="shell pb-12">
        <Suspense fallback={<div className="h-40" />}>
          <CatalogFilters
            disciplines={disciplinesOf(books)}
            autoFocus={first(params.foco) === "busca"}
          />
        </Suspense>
      </section>

      <section className="shell pb-24">
        {result.length === 0 ? (
          <div className="border-t border-line py-24 text-center">
            <p className="font-display text-3xl">Nada por aqui ainda.</p>
            <p className="mt-4 text-sm text-muted">
              Ajuste os filtros ou seja quem envia o primeiro título dessa área.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 border-t border-line pt-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-8">
            {result.map((book, index) => (
              <BookCard key={book.id} book={book} index={index} className="rise" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
