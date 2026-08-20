import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BookLedger } from "@/components/book-ledger";
import { BookRail } from "@/components/book-rail";
import { Hero } from "@/components/hero";
import { Marquee } from "@/components/marquee";
import { disciplinesOf, listBooks } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const books = await listBooks();

  if (books.length === 0) {
    return (
      <div className="shell flex min-h-[70svh] flex-col justify-center py-24">
        <span className="label">Silo · Acervo MBA USP/Esalq</span>
        <h1 className="display mt-4 max-w-2xl text-[clamp(2rem,5vw,3.5rem)]">
          A estante ainda está vazia.
        </h1>
        <p className="prose-sm mt-4 max-w-sm">
          Crie sua conta e envie o primeiro material — o acervo começa aí.
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/criar-conta" className="btn btn-solid">
            Criar conta
          </Link>
          <Link href="/entrar" className="btn btn-ghost">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  const featured = books.find((book) => book.featured) ?? books[0];
  const disciplines = disciplinesOf(books);
  const pages = books.reduce((total, book) => total + (book.pages ?? 0), 0);

  const stats = [
    { value: String(books.length).padStart(2, "0"), label: "títulos" },
    { value: String(disciplines.length).padStart(2, "0"), label: "áreas" },
    { value: pages.toLocaleString("pt-BR"), label: "páginas" },
    {
      value: books.reduce((total, book) => total + book.downloads, 0).toLocaleString("pt-BR"),
      label: "downloads",
    },
  ];

  return (
    <>
      <Hero book={featured} total={books.length} />

      <Marquee items={disciplines} />

      <BookRail
        title="Adicionados recentemente"
        index="002"
        books={books.slice(0, 14)}
        href="/acervo?ordem=recentes"
      />

      <section className="shell py-10">
        <div className="mb-5 flex items-end justify-between gap-6 border-b border-line pb-2.5">
          <div className="flex items-baseline gap-3">
            <span className="num">003</span>
            <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">Índice do acervo</h2>
          </div>
          <Link
            href="/acervo?vista=indice"
            className="underline-grow text-[0.625rem] uppercase tracking-[0.2em] text-muted hover:text-bone"
          >
            Ver índice completo
          </Link>
        </div>
        <BookLedger books={books.slice(0, 8)} />
      </section>

      <section className="border-y border-line">
        <div className="shell grid grid-cols-2 divide-x divide-[color:var(--color-line)] md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="px-4 py-6 first:pl-0 last:pr-0">
              <p className="display text-[2rem] leading-none">{stat.value}</p>
              <p className="label mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {disciplines.slice(0, 2).map((discipline, index) => (
        <BookRail
          key={discipline.name}
          title={discipline.name}
          index={String(index + 4).padStart(3, "0")}
          books={books.filter((book) => book.discipline === discipline.name)}
          href={`/acervo?disciplina=${encodeURIComponent(discipline.name)}`}
        />
      ))}

      <section className="shell py-12">
        <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-2.5">
          <span className="num">006</span>
          <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">Coleções</h2>
        </div>

        {/* Borders per cell, not a filled gap grid: an incomplete last row
            must read as empty space, never as a grey placeholder. */}
        <div className="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {disciplines.map((discipline, index) => (
            <Link
              key={discipline.name}
              href={`/acervo?disciplina=${encodeURIComponent(discipline.name)}`}
              className="group flex min-h-[7rem] flex-col justify-between border-b border-r border-line p-4 transition-colors hover:bg-ink-2"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="num">{String(index + 1).padStart(2, "0")}</span>
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-dim transition-transform duration-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bone"
                  strokeWidth={1.4}
                />
              </div>
              <div>
                <h3 className="display text-[1.125rem] leading-tight">{discipline.name}</h3>
                <p className="label mt-1.5">
                  {discipline.count} {discipline.count === 1 ? "título" : "títulos"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="shell pb-14">
        <div className="relative overflow-hidden border border-line px-6 py-10 md:px-10 md:py-12">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(70% 120% at 8% 0%, rgba(63,123,234,0.2), transparent 60%)",
            }}
          />
          <span className="label">Contribua</span>
          <h2 className="display mt-3 max-w-xl text-[clamp(1.5rem,3.2vw,2.5rem)]">
            Tem material que ajudou você? Coloque na estante.
          </h2>
          <p className="prose-sm mt-4 max-w-md">
            Suba o PDF, descreva em trinta segundos e o arquivo entra no Silo
            valendo para todas as turmas.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/enviar" className="btn btn-solid">
              Enviar material
            </Link>
            <Link href="/criar-conta" className="btn btn-ghost">
              Criar conta
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
