import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Download, Layers } from "lucide-react";
import { BookCard } from "@/components/book-card";
import { BookCover } from "@/components/book-cover";
import { BookLedger } from "@/components/book-ledger";
import { listBooks } from "@/lib/catalog";
import { collectionBySlug, collectionsOf, neighbourCollections } from "@/lib/curation";
import { withCoverUrls } from "@/lib/cover-url";
import { KIND_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/colecoes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const collection = collectionBySlug(await listBooks(), slug);
  if (!collection) return { title: "Coleção não encontrada" };

  return {
    title: collection.name,
    description: `${collection.count} títulos de ${collection.name} no acervo do MBA em Data Science.`,
  };
}

function range(years: number[]) {
  if (years.length === 0) return "—";
  const low = Math.min(...years);
  const high = Math.max(...years);
  return low === high ? String(low) : `${low}–${high}`;
}

export default async function CollectionPage({ params }: PageProps<"/colecoes/[slug]">) {
  const { slug } = await params;
  const books = await listBooks();
  const found = collectionBySlug(books, slug);
  if (!found) notFound();

  const collection = { ...found, books: await withCoverUrls(found.books) };
  const neighbours = neighbourCollections(collectionsOf(books), found);
  const position = collectionsOf(books).findIndex((item) => item.slug === slug) + 1;
  const accent = collection.books[0]?.accent ?? "#16324F";
  const shelf = collection.books.slice(0, 5);

  const stats = [
    { value: String(collection.count).padStart(2, "0"), label: "títulos" },
    { value: collection.pages.toLocaleString("pt-BR"), label: "páginas" },
    { value: collection.downloads.toLocaleString("pt-BR"), label: "downloads" },
    { value: String(collection.authors.length).padStart(2, "0"), label: "autores" },
    { value: range(collection.years), label: "período" },
  ];

  return (
    <div className="pt-[var(--header)]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-96"
        style={{
          background: `radial-gradient(70% 100% at 18% 0%, ${accent}66, transparent 72%)`,
        }}
      />

      <section className="shell pt-6">
        <Link
          href="/colecoes"
          className="underline-grow inline-flex items-center gap-1.5 text-[0.625rem] uppercase tracking-[0.2em] text-muted hover:text-bone"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          Coleções
        </Link>
      </section>

      <section className="shell grid gap-8 pt-6 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-16">
        <div className="rise">
          <div className="flex items-center gap-3">
            <span className="num">{String(position).padStart(2, "0")}</span>
            <span className="h-px w-8 bg-line" />
            <span className="label">Coleção</span>
          </div>

          <h1 className="display mt-5 max-w-[16ch] text-[clamp(2rem,5vw,4rem)]">
            {collection.name}
          </h1>

          <p className="prose-sm mt-5 max-w-lg">
            {collection.count} {collection.count === 1 ? "título" : "títulos"} de{" "}
            {collection.authors
              .slice(0, 3)
              .map((author) => author.name)
              .join(", ")}
            {collection.authors.length > 3 ? " e outros" : ""} — {collection.pages.toLocaleString("pt-BR")}{" "}
            páginas que a turma já baixou {collection.downloads.toLocaleString("pt-BR")} vezes.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Link
              href={`/acervo?disciplina=${encodeURIComponent(collection.name)}`}
              className="btn btn-solid"
            >
              <Layers className="h-3.5 w-3.5" strokeWidth={1.6} />
              Buscar dentro da coleção
            </Link>
            <Link
              href={`/acervo?disciplina=${encodeURIComponent(collection.name)}&ordem=populares`}
              className="btn btn-ghost"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
              Mais baixados da área
            </Link>
          </div>
        </div>

        {/* The shelf itself: covers fanned out, the way a real one reads. */}
        <div className="flex justify-start gap-0 lg:justify-end">
          {shelf.map((book, index) => (
            <Link
              key={book.id}
              href={`/livro/${book.slug}`}
              style={{ zIndex: shelf.length - index, marginLeft: index === 0 ? 0 : "-1.6rem" }}
              className="block w-[19%] max-w-[7.5rem] shrink-0 transition-transform duration-500 hover:-translate-y-2 lg:w-[20%]"
            >
              <BookCover
                book={book}
                priority={index === 0}
                className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)]"
              />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 border-y border-line">
        <div className="shell grid grid-cols-2 divide-x divide-[color:var(--color-line)] sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="px-4 py-6 first:pl-0 last:pr-0">
              <p className="display text-[1.75rem] leading-none">{stat.value}</p>
              <p className="label mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell py-9">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-2.5">
          <div className="flex items-baseline gap-3">
            <span className="num">01</span>
            <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">Na prateleira</h2>
            <span className="num">{String(collection.count).padStart(2, "0")}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {collection.kinds.map((entry) => (
              <Link
                key={entry.kind}
                href={`/acervo?disciplina=${encodeURIComponent(collection.name)}&tipo=${entry.kind}`}
                className="chip"
              >
                {KIND_LABEL[entry.kind]}
                <span className="opacity-45">{String(entry.count).padStart(2, "0")}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
          {collection.books.map((book, index) => (
            <BookCard key={book.id} book={book} index={index} />
          ))}
        </div>
      </section>

      {collection.authors.length > 1 ? (
        <section className="shell py-9">
          <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-2.5">
            <span className="num">02</span>
            <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">Quem assina a área</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {collection.authors.slice(0, 24).map((author) => (
              <Link
                key={author.name}
                href={`/acervo?q=${encodeURIComponent(author.name)}`}
                className="chip h-8 px-3 normal-case tracking-[0.02em]"
              >
                {author.name}
                {author.count > 1 ? (
                  <span className="opacity-45">{String(author.count).padStart(2, "0")}</span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="shell py-9">
        <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-2.5">
          <span className="num">03</span>
          <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">Índice da coleção</h2>
        </div>
        <BookLedger books={collection.books} />
      </section>

      {neighbours.length > 0 ? (
        <section className="shell pb-12">
          <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-2.5">
            <span className="num">04</span>
            <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">Prateleiras vizinhas</h2>
          </div>
          <div className="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {neighbours.map((neighbour) => (
              <Link
                key={neighbour.slug}
                href={`/colecoes/${neighbour.slug}`}
                className="group flex min-h-[8rem] flex-col justify-between border-b border-r border-line p-5 transition-colors hover:bg-ink-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="label">{neighbour.kinds.length} formatos</span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-dim transition-transform duration-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bone"
                    strokeWidth={1.4}
                  />
                </div>
                <div>
                  <h3 className="display text-[1.25rem] leading-tight">{neighbour.name}</h3>
                  <p className="label mt-1.5">
                    {neighbour.count} {neighbour.count === 1 ? "título" : "títulos"} ·{" "}
                    {neighbour.pages.toLocaleString("pt-BR")} páginas
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="shell pb-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="prose-sm max-w-md">
            Falta alguma leitura obrigatória de {collection.name}? Ela cabe aqui.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/enviar" className="btn btn-solid">
              Enviar material
            </Link>
            <Link href="/colecoes" className="btn btn-ghost">
              Todas as coleções
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
