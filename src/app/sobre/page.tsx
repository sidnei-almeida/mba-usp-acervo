import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Como funciona o acervo digital do MBA USP/Esalq.",
};

const STEPS = [
  {
    title: "Envie o PDF",
    body: "Arraste o arquivo, confirme os dados da obra e pronto. O upload vai direto para o Cloudflare R2, sem passar por servidor intermediário.",
  },
  {
    title: "O acervo organiza",
    body: "Cada material entra catalogado por área, formato e palavras-chave — e aparece nas coleções e na busca no mesmo instante.",
  },
  {
    title: "A turma usa",
    body: "Leitura no navegador ou download do arquivo original. Sem cadastro para consultar, sem anúncio, sem limite de banda por pessoa.",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-[4.5rem]">
      <section className="shell py-20 md:py-28">
        <p className="eyebrow">Sobre o acervo</p>
        <h1 className="display mt-6 max-w-4xl text-[clamp(2.5rem,6.5vw,5rem)]">
          Uma estante comum para quem estuda junto.
        </h1>
        <p className="mt-8 max-w-2xl text-[1.0625rem] leading-[1.75] text-[#c2c0bb]">
          Material de MBA circula por grupos de mensagem, e-mail e pen drive até
          desaparecer. Este acervo existe para dar endereço fixo a esse conteúdo:
          um lugar bonito, rápido e pesquisável, mantido pelos próprios alunos do
          MBA USP/Esalq.
        </p>
      </section>

      <section className="border-y border-line bg-ink-2/40 py-20">
        <div className="shell grid gap-12 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title}>
              <p className="font-display text-[2.75rem] leading-none text-white/25">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-5 font-display text-2xl">{step.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="direitos" className="shell py-20">
        <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr]">
          <h2 className="display text-[clamp(1.75rem,4vw,3rem)]">
            Direitos autorais e bom senso.
          </h2>
          <div className="space-y-5 text-[0.9375rem] leading-relaxed text-[#b9b7b2]">
            <p>
              O acervo é mantido por alunos, para uso educacional entre colegas de
              turma. Envie apenas material que você tem direito de compartilhar:
              produção própria, apostilas liberadas, obras de domínio público ou
              com licença aberta.
            </p>
            <p>
              Se você é autor ou editor e identificou algum arquivo publicado
              indevidamente, o item é removido assim que avisado. Basta abrir um
              contato com a equipe do acervo.
            </p>
            <p className="text-muted">
              Esta é uma iniciativa independente de estudantes e não representa a
              USP, a Esalq ou a Fealq.
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link href="/acervo" className="btn btn-solid">
            Explorar o acervo
          </Link>
          <Link href="/enviar" className="btn btn-ghost">
            Enviar material
          </Link>
        </div>
      </section>
    </div>
  );
}
