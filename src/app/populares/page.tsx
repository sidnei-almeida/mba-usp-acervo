import Link from "next/link";
import type { Metadata } from "next";
import { Download, Trophy } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { disciplinesOf, listBooks } from "@/lib/catalog";
import { rankByDownloads } from "@/lib/curation";
import { withCoverUrls } from "@/lib/cover-url";
import { KIND_LABEL, KINDS, type Kind } from "@/lib/types";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mais baixados",
  description:
    "O ranking do acervo do MBA USP/Esalq: os títulos que a turma mais levou para o disco.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Query string for the filter links, keeping whatever is already applied. */
function href(current: { discipline?: string; kind?: string }, patch: Record<string, string | undefined>) {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  if (merged.discipline) params.set("disciplina", merged.discipline);
  if (merged.kind) params.set("tipo", merged.kind);
  const query = params.toString();
  return query ? `/populares?${query}` : "/populares";
}

export default async function PopularPage({ searchParams }: PageProps<"/populares">) {
  const params = await searchParams;
  const all = await withCoverUrls(await listBooks());
  const disciplines = disciplinesOf(all);

  const discipline = disciplines.find((item) => item.name === first(params.disciplina))?.name;
  const kindParam = first(params.tipo);
  const kind = KINDS.includes(kindParam as Kind) ? (kindParam as Kind) : undefined;
  const active = { discipline, kind };

  const scope = all.filter(
    (book) =>
      (!discipline || book.discipline === discipline) && (!kind || book.kind === kind),
  );
  const ranked = rankByDownloads(scope);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const total = scope.reduce((sum, book) => sum + book.downloads, 0);
  const average = scope.length ? Math.round(total / scope.length) : 0;

  const stats = [
    { value: total.toLocaleString("pt-BR"), label: "downloads no recorte" },
    { value: String(scope.length).padStart(2, "0"), label: "títulos disputando" },
    { value: average.toLocaleString("pt-BR"), label: "média por título" },
    {
      value: (podium[0]?.book.downloads ?? 0).toLocaleString("pt-BR"),
      label: "recorde do líder",
    },
  ];

  return (
    <div className="pt-[var(--header)]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-80"
        style={{
          background:
            "radial-gradient(60% 100% at 78% 0%, rgba(201,162,39,0.22), transparent 70%)",
        }}
      />

      <section className="shell pt-10">
        <div className="flex items-center gap-3">
          <span className="num">Top</span>
          <span className="h-px w-8 bg-line" />
          <span className="label">Ranking do acervo</span>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <h1 className="display max-w-[18ch] text-[clamp(1.75rem,4.4vw,3.5rem)]">
            O que a turma mais levou.
          </h1>
          <p className="prose-sm max-w-sm">
            Ordem por download acumulado desde a entrada de cada título no acervo.
            {discipline ? ` Recorte: ${discipline}.` : ""}
          </p>
        </div>
      </section>

      <section className="shell space-y-2.5 py-5">
        <div className="rail gap-1.5 pb-1">
          <Link
            href={href(active, { discipline: undefined })}
            className={`chip${discipline ? "" : " chip-on"}`}
          >
            Todas as áreas
          </Link>
          {disciplines.map((item) => (
            <Link
              key={item.name}
              href={href(active, {
                discipline: discipline === item.name ? undefined : item.name,
              })}
              className={`chip${discipline === item.name ? " chip-on" : ""}`}
            >
              {item.name}
              <span className="opacity-45">{String(item.count).padStart(2, "0")}</span>
            </Link>
          ))}
        </div>

        <div className="rail gap-1.5 border-t border-line pt-2.5">
          <Link
            href={href(active, { kind: undefined })}
            className={`chip${kind ? "" : " chip-on"}`}
          >
            Todo formato
          </Link>
          {KINDS.map((item) => (
            <Link
              key={item}
              href={href(active, { kind: kind === item ? undefined : item })}
              className={`chip${kind === item ? " chip-on" : ""}`}
            >
              {KIND_LABEL[item]}
            </Link>
          ))}
        </div>
      </section>

      {ranked.length === 0 ? (
        <section className="shell border-t border-line py-20 text-center">
          <p className="display text-2xl">Nenhum título neste recorte.</p>
          <p className="prose-sm mt-3">Tire um filtro para ver o ranking completo.</p>
          <div className="mt-6">
            <Link href="/populares" className="btn btn-ghost">
              Limpar filtros
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Pódio: the three that earned the big artwork. */}
          <section className="shell grid gap-6 pb-4 sm:grid-cols-3 sm:gap-8">
            {podium.map((entry, index) => (
              <article
                key={entry.book.id}
                className={index === 0 ? "sm:-mt-2" : index === 2 ? "sm:mt-6" : "sm:mt-3"}
              >
                <div className="mb-3 flex items-baseline gap-2 border-b border-line pb-2">
                  <span className="display text-[2.5rem] leading-none">
                    {String(entry.position).padStart(2, "0")}
                  </span>
                  {index === 0 ? (
                    <Trophy className="h-3.5 w-3.5 text-[#c9a227]" strokeWidth={1.5} />
                  ) : null}
                  <span className="num ml-auto">
                    {entry.book.downloads.toLocaleString("pt-BR")} downloads
                  </span>
                </div>

                <Link href={`/livro/${entry.book.slug}`} className="group block">
                  <div className="transition-transform duration-500 group-hover:-translate-y-1">
                    <BookCover
                      book={entry.book}
                      priority={index === 0}
                      className="shadow-[0_28px_70px_-28px_rgba(0,0,0,0.95)]"
                    />
                  </div>
                  <h2 className="display mt-3.5 text-[1.25rem] leading-tight">
                    {entry.book.title}
                  </h2>
                  <p className="label mt-1.5 truncate">{entry.book.authors.join(" · ")}</p>
                </Link>

                <Link
                  href={`/colecoes/${slugify(entry.book.discipline)}`}
                  className="chip mt-3"
                >
                  {entry.book.discipline}
                </Link>
              </article>
            ))}
          </section>

          <section className="border-y border-line">
            <div className="shell grid grid-cols-2 divide-x divide-[color:var(--color-line)] md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="px-4 py-6 first:pl-0 last:pr-0">
                  <p className="display text-[1.75rem] leading-none">{stat.value}</p>
                  <p className="label mt-2">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          {rest.length > 0 ? (
            <section className="shell py-9">
              <div className="mb-4 flex items-baseline gap-3 border-b border-line pb-2.5">
                <span className="num">04—{String(ranked.length).padStart(2, "0")}</span>
                <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">
                  O resto da tabela
                </h2>
              </div>

              <div>
                {rest.map((entry) => (
                  <Link
                    key={entry.book.id}
                    href={`/livro/${entry.book.slug}`}
                    className="group grid items-center gap-4 border-b border-line py-3 md:grid-cols-[3rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_5.5rem]"
                  >
                    <span className="num group-hover:text-bone">
                      {String(entry.position).padStart(3, "0")}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] text-bone">
                        {entry.book.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.625rem] uppercase tracking-[0.14em] text-dim">
                        {entry.book.authors.join(", ")}
                      </span>
                    </span>

                    <span className="hidden truncate text-[0.625rem] uppercase tracking-[0.16em] text-muted md:block">
                      {entry.book.discipline}
                    </span>

                    {/* Bar reads as share of the leader, not as an axis. */}
                    <span
                      aria-hidden
                      className="hidden h-[3px] w-full bg-[color:var(--color-line)] md:block"
                    >
                      <span
                        className="block h-full bg-bone/70 transition-[width] duration-500"
                        style={{ width: `${Math.max(2, entry.share * 100)}%` }}
                      />
                    </span>

                    <span className="flex items-center justify-end gap-1.5 text-[0.75rem] tabular-nums text-bone">
                      <Download className="h-3 w-3 text-dim" strokeWidth={1.5} />
                      {entry.book.downloads.toLocaleString("pt-BR")}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <section className="shell pb-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="prose-sm max-w-md">
            O ranking se move sozinho: cada download registrado reordena a tabela.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/acervo" className="btn btn-solid">
              Explorar o acervo
            </Link>
            <Link href="/colecoes" className="btn btn-ghost">
              Ver coleções
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
