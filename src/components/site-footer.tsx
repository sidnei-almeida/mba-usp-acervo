import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Acervo",
    links: [
      { href: "/acervo", label: "Todo o acervo" },
      { href: "/colecoes", label: "Coleções" },
      { href: "/populares", label: "Mais baixados" },
      { href: "/acervo?ordem=recentes", label: "Adicionados recentemente" },
    ],
  },
  {
    title: "Comunidade",
    links: [
      { href: "/enviar", label: "Enviar material" },
      { href: "/criar-conta", label: "Criar conta" },
      { href: "/entrar", label: "Entrar" },
      { href: "/sobre", label: "Como funciona" },
      { href: "/faq", label: "Perguntas frequentes" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { href: "/contato", label: "Contato" },
      { href: "/termos", label: "Termos de uso" },
      { href: "/privacidade", label: "Privacidade" },
      { href: "/sobre#direitos", label: "Direitos autorais" },
      { href: "/marca", label: "Marca" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer id="site-footer" className="mt-16 border-t border-line">
      <div className="shell grid gap-8 py-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <BrandLockup size="md" />
          <p className="prose-sm mt-4">
            Silo é a biblioteca mantida por alunos e ex-alunos do MBA em Data Science.
            Um lugar só para o material que circula entre turmas.
          </p>
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="underline-grow mt-4 inline-block text-[0.75rem] text-[#a6a8ab] hover:text-bone"
          >
            {SITE.contactEmail}
          </a>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="label">{column.title}</p>
            <ul className="mt-3 space-y-1.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="underline-grow text-[0.75rem] text-[#a6a8ab] hover:text-bone"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="shell flex flex-col gap-2 border-t border-line py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-[0.625rem] uppercase tracking-[0.16em] text-dim">
          Iniciativa independente de alunos · sem vínculo com instituição de ensino
        </p>
        <p className="num">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
