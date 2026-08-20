import Link from "next/link";
import { EsalqMark } from "@/components/esalq-mark";

const COLUMNS = [
  {
    title: "Navegar",
    links: [
      { href: "/acervo", label: "Todo o acervo" },
      { href: "/colecoes", label: "Coleções" },
      { href: "/acervo?ordem=populares", label: "Mais baixados" },
      { href: "/acervo?ordem=recentes", label: "Adicionados recentemente" },
    ],
  },
  {
    title: "Comunidade",
    links: [
      { href: "/enviar", label: "Enviar material" },
      { href: "/sobre", label: "Como funciona" },
      { href: "/sobre#direitos", label: "Direitos autorais" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-line bg-ink-2/40">
      <div className="shell grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <EsalqMark />
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Biblioteca mantida por alunos e ex-alunos do MBA USP/Esalq. Um lugar
            só para o material que circula entre turmas — organizado, pesquisável
            e sempre disponível.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="eyebrow">{column.title}</p>
            <ul className="mt-5 space-y-3">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="link-underline text-sm text-[#c8c6c1] hover:text-bone"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="shell flex flex-col gap-3 border-t border-line py-7 text-xs text-muted md:flex-row md:items-center md:justify-between">
        <p>
          Iniciativa independente de alunos. Não é um canal oficial da USP, da
          Esalq ou da Fundação de Estudos Agrários Luiz de Queiroz.
        </p>
        <p>© {new Date().getFullYear()} Acervo MBA USP/Esalq</p>
      </div>
    </footer>
  );
}
