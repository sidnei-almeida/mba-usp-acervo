import Link from "next/link";
import type { Metadata } from "next";
import { AtSign, Copyright, LifeBuoy, Palette } from "lucide-react";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato",
  description: "Canais do Silo: suporte, pedidos de remoção, imprensa e uso da marca.",
};

const CHANNELS = [
  {
    icon: LifeBuoy,
    label: "Suporte e dúvidas",
    email: SITE.contactEmail,
    body: "Problema para enviar um arquivo, erro na ficha de um título, senha perdida, conta a encerrar. Resposta em dias úteis, por gente que também está fazendo o curso.",
  },
  {
    icon: Copyright,
    label: "Direitos autorais",
    email: SITE.copyrightEmail,
    body: "Canal direto para autores, editoras e titulares de direito. Pedido de retirada é atendido assim que verificado, sem exigir ordem judicial prévia.",
  },
  {
    icon: Palette,
    label: "Marca e imprensa",
    email: SITE.contactEmail,
    body: "Uso do letreiro, do glifo e da paleta em material de terceiros. O kit completo está aberto na página de marca.",
  },
];

const TAKEDOWN = [
  {
    title: "O endereço da página",
    body: "O link do título no Silo, no formato /livro/nome-da-obra. É o que identifica o registro sem ambiguidade.",
  },
  {
    title: "A obra envolvida",
    body: "Título, autoria e, se houver, ISBN ou edição. Basta o suficiente para casar o arquivo com a obra protegida.",
  },
  {
    title: "Sua relação com a obra",
    body: "Autor, editora, representante legal ou detentor da licença. Uma linha resolve; não pedimos documentação formal.",
  },
  {
    title: "O que você quer que aconteça",
    body: "Retirada completa, substituição por versão autorizada ou correção de crédito. O padrão, se nada for dito, é retirar.",
  },
];

export default function ContactPage() {
  return (
    <div className="pt-[var(--header)]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-72"
        style={{
          background:
            "radial-gradient(55% 100% at 12% 0%, rgba(63,123,234,0.2), transparent 68%)",
        }}
      />

      <section className="shell pt-10">
        <div className="flex items-center gap-3">
          <span className="num">C—01</span>
          <span className="h-px w-8 bg-line" />
          <span className="label">Contato</span>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-5">
          <h1 className="display max-w-[15ch] text-[clamp(1.75rem,4.4vw,3.5rem)]">
            Do outro lado tem um colega de turma.
          </h1>
          <p className="prose-sm max-w-sm">
            Não há central de atendimento nem formulário que some num sistema de
            tíquetes. São três endereços, lidos por quem mantém o acervo.
          </p>
        </div>
      </section>

      <section className="shell py-8">
        <div className="grid border-l border-t border-line md:grid-cols-3">
          {CHANNELS.map((channel) => (
            <a
              key={channel.label}
              href={`mailto:${channel.email}`}
              className="group flex flex-col justify-between gap-6 border-b border-r border-line p-6 transition-colors hover:bg-ink-2"
            >
              <channel.icon
                className="h-5 w-5 text-dim transition-colors group-hover:text-bone"
                strokeWidth={1.3}
              />
              <div>
                <h2 className="display text-[1.25rem] leading-tight">{channel.label}</h2>
                <p className="prose-sm mt-2.5">{channel.body}</p>
                <p className="underline-grow mt-4 inline-flex items-center gap-1.5 text-[0.6875rem] tracking-[0.06em] text-bone">
                  <AtSign className="h-3 w-3 text-dim" strokeWidth={1.6} />
                  {channel.email}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="shell grid gap-8 border-t border-line py-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <span className="label">Pedido de remoção</span>
          <h2 className="display mt-3 text-[clamp(1.375rem,3vw,2.25rem)]">
            Quatro linhas resolvem.
          </h2>
          <p className="prose-sm mt-4 max-w-sm">
            Um pedido de retirada não precisa de papel timbrado. Estas quatro
            informações bastam para localizar o arquivo e agir no mesmo dia.
          </p>
          <a
            href={`mailto:${SITE.copyrightEmail}?subject=${encodeURIComponent("Pedido de remoção — Silo")}`}
            className="btn btn-solid mt-6"
          >
            Abrir e-mail de remoção
          </a>
        </div>

        <ol className="border-t border-line">
          {TAKEDOWN.map((item, index) => (
            <li key={item.title} className="flex gap-5 border-b border-line py-5">
              <span className="num pt-1">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-[0.875rem] text-bone">{item.title}</h3>
                <p className="prose-sm mt-1.5 max-w-lg">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="shell pb-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="prose-sm max-w-md">
            Antes de escrever, vale um olhar nas perguntas frequentes — boa parte
            das dúvidas já está respondida lá.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/faq" className="btn btn-ghost">
              Perguntas frequentes
            </Link>
            <Link href="/marca" className="btn btn-ghost">
              Kit de marca
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
