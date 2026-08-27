import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Como funciona o Silo, o acervo digital do MBA em Data Science.",
};

const STEPS = [
  {
    title: "Crie sua conta",
    body: "Usuário e senha, nada além disso. A conta identifica quem enviou cada material e permite corrigir ou remover o que é seu.",
  },
  {
    title: "Envie o PDF",
    body: "Arraste o arquivo, confirme os dados da obra e pronto. O PDF é compactado e vai direto para o armazenamento do acervo, sem passar por servidor intermediário.",
  },
  {
    title: "A turma usa",
    body: "Leitura no navegador ou download do arquivo original. Consultar não exige cadastro, e não há limite de banda por pessoa.",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-[var(--header)]">
      <section className="shell pt-10">
        <div className="flex items-center gap-3">
          <span className="num">005</span>
          <span className="h-px w-8 bg-line" />
          <span className="label">Sobre o acervo</span>
        </div>
        <h1 className="display mt-5 max-w-3xl text-[clamp(1.75rem,4.4vw,3.5rem)]">
          Uma estante comum para quem estuda junto.
        </h1>
        <p className="prose-sm mt-5 max-w-xl">
          Material de MBA circula por grupos de mensagem, e-mail e pen drive até
          desaparecer. O Silo existe para dar endereço fixo a esse conteúdo: um
          lugar rápido e pesquisável, mantido pelos próprios alunos do MBA em
          Data Science.
        </p>
      </section>

      <section className="shell mt-10 grid gap-px border-y border-line bg-line md:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="bg-ink p-5">
            <span className="num">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="display mt-3 text-lg">{step.title}</h2>
            <p className="prose-sm mt-2">{step.body}</p>
          </div>
        ))}
      </section>

      <section id="direitos" className="shell grid gap-8 py-12 md:grid-cols-[0.8fr_1.2fr]">
        <h2 className="display text-[clamp(1.375rem,3vw,2.25rem)]">
          Direitos autorais e bom senso.
        </h2>
        <div className="prose-sm max-w-xl space-y-3">
          <p>
            O Silo é mantido por alunos, para uso educacional entre colegas de
            turma. Envie apenas material que você tem direito de compartilhar:
            produção própria, apostilas liberadas, obras de domínio público ou com
            licença aberta.
          </p>
          <p>
            Se você é autor ou editor e identificou algum arquivo publicado
            indevidamente, o item é removido assim que avisado.
          </p>
          <p className="text-dim">
            Iniciativa independente de estudantes, sem vínculo com qualquer
            instituição de ensino.
          </p>
        </div>
      </section>

      <section className="shell pb-14">
        <div className="flex flex-wrap gap-2 border-t border-line pt-6">
          <Link href="/acervo" className="btn btn-solid">
            Explorar o acervo
          </Link>
          <Link href="/criar-conta" className="btn btn-ghost">
            Criar conta
          </Link>
          <Link href="/faq" className="btn btn-ghost">
            Perguntas frequentes
          </Link>
        </div>
      </section>
    </div>
  );
}
