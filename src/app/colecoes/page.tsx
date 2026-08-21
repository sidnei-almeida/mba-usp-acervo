import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { listBooks } from "@/lib/catalog";
import { collectionsOf } from "@/lib/curation";
import { withCoverUrls } from "@/lib/cover-url";
import { KIND_LABEL, KINDS } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coleções",
  description: "As áreas do MBA USP/Esalq, organizadas em coleções navegáveis.",
};

export default async function CollectionsPage() {
  const books = await withCoverUrls(await listBooks());
  const collections = collectionsOf(books);
  const pages = collections.reduce((total, item) => total + item.pages, 0);

  return (
    <div className="pt-[var(--header)]">
      <section className="shell pt-10">
        <div className="flex items-center gap-3">
          <span className="num">004</span>
          <span className="h-px w-8 bg-line" />
          <span className="label">Coleções</span>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <h1 className="display text-[clamp(1.75rem,4vw,3rem)]">
            O curso inteiro, em prateleiras.
          </h1>
          <p className="label">
            {String(collections.length).padStart(2, "0")} áreas ·{" "}
            {pages.toLocaleString("pt-BR")} páginas
          </p>
        </div>
      </section>

      <section className="shell">
        {collections.map((collection, index) => {
          const items = collection.books;
          return (
            <Link
              key={collection.slug}
              href={`/colecoes/${collection.slug}`}
              className="group grid gap-4 border-b border-line py-5 transition-colors hover:bg-ink-2 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8"
            >
              <span className="num">{String(index + 1).padStart(2, "0")}</span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="display text-[clamp(1.25rem,2.6vw,2rem)] leading-none">
                    {collection.name}
                  </h2>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-dim transition-transform duration-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bone"
                    strokeWidth={1.4}
                  />
                </div>
                <p className="label mt-2 truncate">
                  {collection.count} {collection.count === 1 ? "título" : "títulos"} ·{" "}
                  {collection.pages.toLocaleString("pt-BR")} páginas ·{" "}
                  {collection.authors
                    .slice(0, 3)
                    .map((author) => author.name)
                    .join(" · ")}
                </p>
              </div>

              <div className="flex -space-x-6 md:justify-end">
                {items.slice(0, 4).map((book, position) => (
                  <div
                    key={book.id}
                    className="w-11 shrink-0 transition-transform duration-500 group-hover:-translate-y-1"
                    style={{ zIndex: 4 - position, transitionDelay: `${position * 40}ms` }}
                  >
                    <BookCover book={book} className="shadow-[0_14px_30px_-14px_rgba(0,0,0,0.9)]" />
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="shell py-10">
        <p className="label">Por formato</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {KINDS.map((kind) => (
            <Link key={kind} href={`/acervo?tipo=${kind}`} className="chip h-8 px-3">
              {KIND_LABEL[kind]}
              <span className="opacity-45">
                {String(books.filter((book) => book.kind === kind).length).padStart(2, "0")}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
