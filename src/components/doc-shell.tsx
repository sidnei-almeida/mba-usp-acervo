import Link from "next/link";

export type DocSection = {
  id: string;
  title: string;
  body: React.ReactNode;
};

/**
 * Layout for the written pages — terms, privacy, contact. A sticky index on
 * the left, numbered sections on the right: the archive's own ledger grammar
 * applied to prose.
 */
export function DocShell({
  eyebrow,
  index,
  title,
  intro,
  meta,
  sections,
  footer,
}: {
  eyebrow: string;
  index: string;
  title: string;
  intro: string;
  meta?: string;
  sections: DocSection[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="pt-[var(--header)]">
      <section className="shell pt-10">
        <div className="flex items-center gap-3">
          <span className="num">{index}</span>
          <span className="h-px w-8 bg-line" />
          <span className="label">{eyebrow}</span>
        </div>
        <h1 className="display mt-5 max-w-3xl text-[clamp(1.75rem,4.4vw,3.5rem)]">{title}</h1>
        <p className="prose-sm mt-5 max-w-xl">{intro}</p>
        {meta ? <p className="label mt-6">{meta}</p> : null}
      </section>

      <div className="shell mt-10 grid gap-10 border-t border-line pt-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Índice da página" className="lg:sticky lg:top-20 lg:self-start">
          <p className="label">Nesta página</p>
          <ol className="mt-3 space-y-1.5">
            {sections.map((section, position) => (
              <li key={section.id} className="flex gap-2.5">
                <span className="num pt-[0.15rem]">{String(position + 1).padStart(2, "0")}</span>
                <Link
                  href={`#${section.id}`}
                  className="underline-grow text-[0.75rem] leading-snug text-[#a6a8ab] hover:text-bone"
                >
                  {section.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-2xl">
          {sections.map((section, position) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 border-b border-line py-7 first:pt-0 last:border-b-0"
            >
              <div className="flex items-baseline gap-3">
                <span className="num">{String(position + 1).padStart(2, "0")}</span>
                <h2 className="display text-[1.375rem] leading-tight">{section.title}</h2>
              </div>
              <div className="prose-sm mt-4 space-y-3">{section.body}</div>
            </section>
          ))}
        </div>
      </div>

      {footer ? <section className="shell pb-14 pt-10">{footer}</section> : null}
    </div>
  );
}
