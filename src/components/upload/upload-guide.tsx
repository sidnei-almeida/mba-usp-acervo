"use client";

import { BookOpen, ChevronDown } from "lucide-react";

const EXAMPLE = [
  { field: "Título", value: "Administração de Marketing", note: "Só o nome da obra. Sem edição, sem autor, sem nome de arquivo." },
  { field: "Subtítulo", value: "A Bíblia do Marketing", note: "O complemento, quando existir na capa." },
  { field: "Autores", value: "Philip Kotler, Kevin Lane Keller", note: "Nome e sobrenome, separados por vírgula. Nada de 'et al'." },
  { field: "Área", value: "Marketing", note: "Reaproveite uma área da lista. Área nova só quando nenhuma servir." },
  { field: "Formato", value: "Livro", note: "Apostila, artigo, slides e estudo de caso têm cada um o seu." },
  { field: "Editora", value: "Pearson", note: "Sem a palavra 'Editora' na frente." },
  { field: "Ano", value: "2012", note: "Ano da edição enviada, quatro dígitos." },
  { field: "Edição", value: "14ª edição", note: "Só quando a obra tiver mais de uma." },
  { field: "Palavras-chave", value: "segmentação, posicionamento, valor", note: "Três a cinco temas, minúsculas." },
  { field: "Descrição", value: "Duas frases sobre o que o material cobre e para quem serve.", note: "Sem copiar a orelha do livro inteira." },
];

/**
 * The filled-in example a contributor reads before typing. Collapsed by
 * default so it never stands between someone in a hurry and the form.
 */
export function UploadGuide() {
  return (
    <details className="group border border-line bg-ink-2/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <BookOpen className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.4} />
        <span className="min-w-0">
          <span className="block text-[0.8125rem] text-bone">Como preencher</span>
          <span className="block text-[0.6875rem] text-dim">
            Um exemplo completo, campo a campo — o padrão que mantém o acervo pesquisável.
          </span>
        </span>
        <ChevronDown
          className="ml-auto h-3.5 w-3.5 shrink-0 text-dim transition-transform duration-300 group-open:rotate-180"
          strokeWidth={1.6}
        />
      </summary>

      <div className="border-t border-line px-4 pb-4 pt-1">
        <dl>
          {EXAMPLE.map((row) => (
            <div
              key={row.field}
              className="grid gap-x-4 gap-y-0.5 border-b border-line py-2.5 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <dt className="label pt-[0.15rem]">{row.field}</dt>
              <dd>
                <span className="block text-[0.8125rem] text-bone">{row.value}</span>
                <span className="mt-0.5 block text-[0.6875rem] leading-snug text-dim">
                  {row.note}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 text-[0.6875rem] leading-relaxed text-dim">
          Número de páginas e capa saem sozinhos do PDF. Se algo escapar do
          padrão, o acervo ajusta na hora de salvar — não trave por causa de
          uma vírgula.
        </p>
      </div>
    </details>
  );
}
