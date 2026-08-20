import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog-browser";
import { disciplinesOf, listBooks } from "@/lib/catalog";
import { EMPTY_FILTERS, type Filters, type SortKey } from "@/lib/search";

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

  const sort = first(params.ordem);
  const initialFilters: Filters = {
    ...EMPTY_FILTERS,
    q: first(params.q) ?? "",
    discipline: first(params.disciplina) ?? "todas",
    kind: first(params.tipo) ?? "todos",
    sort: (["recentes", "titulo", "populares", "ano"] as const).includes(sort as SortKey)
      ? (sort as SortKey)
      : "recentes",
  };

  return (
    <div className="pt-[var(--header)]">
      <section className="shell pt-10">
        <div className="flex items-baseline gap-3">
          <span className="num">A—Z</span>
          <span className="label">Acervo completo</span>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <h1 className="display text-[clamp(1.75rem,4vw,3rem)]">
            {initialFilters.discipline !== "todas"
              ? initialFilters.discipline
              : "Tudo o que a turma compartilhou"}
          </h1>
          <p className="label">{String(books.length).padStart(2, "0")} títulos no acervo</p>
        </div>
      </section>

      <section className="shell py-5 pb-16">
        <Suspense fallback={<div className="h-28" />}>
          <CatalogBrowser
            books={books}
            disciplines={disciplinesOf(books)}
            initialFilters={initialFilters}
            initialView={first(params.vista) === "indice" ? "indice" : "grade"}
            autoFocus={first(params.foco) === "busca"}
          />
        </Suspense>
      </section>
    </div>
  );
}
