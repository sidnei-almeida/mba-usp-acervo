import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BookRail } from "@/components/book-rail";
import { Hero } from "@/components/hero";
import { disciplinesOf, listBooks } from "@/lib/catalog";
import { accentFor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const books = await listBooks();

  if (books.length === 0) {
    return (
      <div className="shell flex min-h-[70svh] flex-col justify-center py-32">
        <p className="eyebrow">Acervo MBA USP/Esalq</p>
        <h1 className="display mt-6 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)]">
          A estante ainda está vazia.
        </h1>
        <p className="mt-6 max-w-xl text-muted">
          Envie o primeiro material e o acervo começa a existir.
        </p>
        <Link href="/enviar" className="btn btn-solid mt-10 self-start">
          Enviar material
        </Link>
      </div>
    );
  }

  const featured = books.find((book) => book.featured) ?? books[0];
  const disciplines = disciplinesOf(books);
  const pages = books.reduce((total, book) => total + (book.pages ?? 0), 0);

  const stats = [
    { value: books.length, label: "títulos disponíveis" },
    { value: disciplines.length, label: "áreas do curso" },
    { value: pages.toLocaleString("pt-BR"), label: "páginas catalogadas" },
    {
      value: books.reduce((total, book) => total + book.downloads, 0).toLocaleString("pt-BR"),
      label: "downloads da turma",
    },
  ];

  return (
    <>
      <Hero book={featured} total={books.length} />

      <BookRail
        title="Adicionados recentemente"
        description="O que a turma subiu por último — do caso da semana ao livro-texto da disciplina."
        books={books.slice(0, 12)}
        href="/acervo?ordem=recentes"
      />

      <section className="border-y border-line bg-ink-2/50 py-16">
        <div className="shell grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-[3.25rem] leading-none">{stat.value}</p>
              <p className="mt-3 text-[0.6875rem] uppercase tracking-[0.2em] text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {disciplines.slice(0, 3).map((discipline) => (
        <BookRail
          key={discipline.name}
          title={discipline.name}
          books={books.filter((book) => book.discipline === discipline.name)}
          href={`/acervo?disciplina=${encodeURIComponent(discipline.name)}`}
        />
      ))}

      <section className="py-20">
        <div className="shell">
          <p className="eyebrow">Coleções</p>
          <h2 className="display mt-5 max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)]">
            Percorra o curso por área.
          </h2>

          <div className="mt-12 grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {disciplines.map((discipline) => (
              <Link
                key={discipline.name}
                href={`/acervo?disciplina=${encodeURIComponent(discipline.name)}`}
                className="group relative flex min-h-[11rem] flex-col justify-between bg-ink p-7 transition-colors hover:bg-ink-3"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px] opacity-70"
                  style={{ background: accentFor(discipline.name) }}
                />
                <div className="flex items-start justify-between gap-4">
                  <h3 className="max-w-[14ch] font-display text-[1.75rem] leading-[1.05]">
                    {discipline.name}
                  </h3>
                  <ArrowUpRight
                    className="h-5 w-5 shrink-0 text-muted transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-bone"
                    strokeWidth={1.4}
                  />
                </div>
                <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-muted">
                  {discipline.count} {discipline.count === 1 ? "título" : "títulos"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="shell">
          <div className="relative overflow-hidden rounded-[6px] border border-line px-8 py-16 md:px-16 md:py-24">
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(90% 130% at 12% 0%, rgba(59,122,228,0.28), transparent 62%), linear-gradient(180deg,#0f1113,#0a0b0d)",
              }}
            />
            <p className="eyebrow">Contribua</p>
            <h2 className="display mt-5 max-w-2xl text-[clamp(2rem,4.5vw,3.5rem)]">
              Tem material que ajudou você? Coloque na estante.
            </h2>
            <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-[#b9b7b2]">
              Suba o PDF, descreva em trinta segundos e o arquivo passa a valer
              para todas as turmas. Guardado no Cloudflare R2, servido rápido de
              qualquer lugar.
            </p>
            <Link href="/enviar" className="btn btn-solid mt-10">
              Enviar material
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
