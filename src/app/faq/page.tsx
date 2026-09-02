import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { SITE } from "@/lib/site";
import { limits } from "@/lib/traffic/limits";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description: "Como usar, enviar e remover material no Silo, o acervo do MBA em Data Science.",
};

type Entry = { q: string; a: React.ReactNode };
type Group = { index: string; title: string; blurb: string; entries: Entry[] };

const GROUPS: Group[] = [
  {
    index: "01",
    title: "Usar o acervo",
    blurb: "Consulta, leitura e download.",
    entries: [
      {
        q: "Preciso de conta para ler ou baixar?",
        a: (
          <p>
            Não. Consulta, leitura no navegador e download do PDF original são
            abertos. A conta só é necessária para enviar material.
          </p>
        ),
      },
      {
        q: "Dá para ler sem baixar o arquivo?",
        a: (
          <p>
            Sim. Todo título tem o botão <span className="text-bone">Ler agora</span>,
            que abre o PDF direto no navegador, página a página, sem ocupar espaço
            no seu disco.
          </p>
        ),
      },
      {
        q: "Existe limite de downloads?",
        a: (
          <>
            <p>
              Existe, e ele é do acervo, não seu: o armazenamento roda no plano
              gratuito do Backblaze B2, que libera cerca de 1 GB de tráfego por
              dia. O Silo entrega {limits.concurrent} arquivos por vez e conta{" "}
              {limits.perPerson} downloads por pessoa a cada dia, para o acervo
              caber no dia de todo mundo. A cota vira à meia-noite (UTC).
            </p>
            <p className="mt-3">
              O contador que aparece em cada ficha é outra coisa: o total
              acumulado da obra, usado para montar o{" "}
              <Link href="/populares" className="underline-grow text-bone">
                ranking de mais baixados
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        q: "Por que meu download entrou numa fila?",
        a: (
          <p>
            Porque outras pessoas estavam baixando no mesmo instante. Em vez de
            derrubar o armazenamento e devolver um erro seco, o Silo põe o pedido
            numa fila, mostra a sua posição e um relógio, e começa a transferência
            sozinho quando chega a sua vez — basta deixar a página aberta. Se
            aparecer um aviso de pausa, o armazenamento pediu calma: ele volta
            sozinho, e a página tenta de novo quando o relógio zera.
          </p>
        ),
      },
      {
        q: "Como encontro material de uma disciplina específica?",
        a: (
          <p>
            Cada área tem sua própria página em{" "}
            <Link href="/colecoes" className="underline-grow text-bone">
              coleções
            </Link>
            , com todos os títulos, autores e formatos daquela prateleira. Para
            busca livre por título, autor ou tema, use o campo do{" "}
            <Link href="/acervo" className="underline-grow text-bone">
              acervo
            </Link>{" "}
            — a tecla <kbd className="border border-line px-1 text-[0.625rem]">/</kbd>{" "}
            leva o cursor direto para lá.
          </p>
        ),
      },
    ],
  },
  {
    index: "02",
    title: "Enviar material",
    blurb: "O que entra, como entra e o que acontece depois.",
    entries: [
      {
        q: "Que formato de arquivo é aceito?",
        a: (
          <p>
            PDF. É o formato que atravessa sistema operacional, leitor e ano sem
            se degradar, e o único que o leitor embutido consegue abrir.
          </p>
        ),
      },
      {
        q: "Meu PDF é enorme. Tem limite de tamanho?",
        a: (
          <p>
            Antes de ocupar o acervo, o arquivo passa por uma etapa de compactação
            que reduz o peso preservando o texto. Muitos títulos chegam a perder
            mais da metade do tamanho — a ficha mostra a redução aplicada quando
            ela acontece.
          </p>
        ),
      },
      {
        q: "Quanto tempo leva para o material aparecer?",
        a: (
          <p>
            É imediato. Terminado o envio, o título já está na estante, na busca e
            nas coleções da área escolhida.
          </p>
        ),
      },
      {
        q: "Posso corrigir os dados depois de enviar?",
        a: (
          <p>
            Sim. Quem enviou continua dono do registro e pode ajustar informações
            ou remover o item pela própria ficha do título, com a conta conectada.
          </p>
        ),
      },
      {
        q: "E se o título já existir no acervo?",
        a: (
          <p>
            Vale checar antes pela busca. Duplicatas não quebram nada, mas dividem
            o contador de downloads e poluem a prateleira — quando aparecem, uma
            das cópias é retirada.
          </p>
        ),
      },
    ],
  },
  {
    index: "03",
    title: "Conta",
    blurb: "Acesso, senha e saída.",
    entries: [
      {
        q: "O que é pedido no cadastro?",
        a: (
          <p>
            Usuário e senha, nada além disso. Sem e-mail, sem telefone, sem
            documento. O detalhamento está na{" "}
            <Link href="/privacidade" className="underline-grow text-bone">
              página de privacidade
            </Link>
            .
          </p>
        ),
      },
      {
        q: "Esqueci a senha. E agora?",
        a: (
          <p>
            Como não guardamos e-mail, não existe recuperação automática. Escreva
            para{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="underline-grow text-bone">
              {SITE.contactEmail}
            </a>{" "}
            para tratar caso a caso.
          </p>
        ),
      },
      {
        q: "Posso apagar minha conta?",
        a: (
          <p>
            Pode, a qualquer momento e sem período de carência. Basta pedir pelo
            contato. Se você quiser manter no ar o material que enviou, diga isso
            no pedido — os arquivos e a conta são coisas separadas.
          </p>
        ),
      },
    ],
  },
  {
    index: "04",
    title: "Direitos e remoção",
    blurb: "Quando um arquivo não deveria estar aqui.",
    entries: [
      {
        q: "Isso é legal?",
        a: (
          <p>
            O acervo se sustenta no que os próprios alunos têm direito de
            compartilhar: produção própria, material liberado pelo curso, obras em
            domínio público e artigos de acesso aberto. Cópia de obra comercial
            protegida não tem lugar aqui — o critério completo está nos{" "}
            <Link href="/termos" className="underline-grow text-bone">
              termos de uso
            </Link>
            .
          </p>
        ),
      },
      {
        q: "Sou autor ou editor e quero retirar uma obra.",
        a: (
          <p>
            O pedido é atendido assim que recebido, sem exigir ordem judicial.
            Escreva para{" "}
            <a href={`mailto:${SITE.copyrightEmail}`} className="underline-grow text-bone">
              {SITE.copyrightEmail}
            </a>{" "}
            com o endereço da página. O passo a passo está em{" "}
            <Link href="/contato" className="underline-grow text-bone">
              contato
            </Link>
            .
          </p>
        ),
      },
      {
        q: "O Silo é ligado a alguma instituição de ensino?",
        a: (
          <p>
            Não. É uma iniciativa independente de estudantes, sem vínculo,
            patrocínio ou representação institucional de qualquer universidade
            ou escola.
          </p>
        ),
      },
    ],
  },
];

function Question({ entry }: { entry: Entry }) {
  return (
    <details className="group border-b border-line">
      <summary className="flex cursor-pointer list-none items-start gap-4 py-4 text-[0.875rem] leading-snug text-bone transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
        <Plus
          className="mt-[0.15rem] h-3.5 w-3.5 shrink-0 text-dim transition-transform duration-300 group-open:rotate-45 group-open:text-bone"
          strokeWidth={1.6}
        />
        {entry.q}
      </summary>
      <div className="prose-sm max-w-xl pb-5 pl-[1.875rem]">{entry.a}</div>
    </details>
  );
}

export default function FaqPage() {
  const total = GROUPS.reduce((sum, group) => sum + group.entries.length, 0);

  return (
    <div className="pt-[var(--header)]">
      <section className="shell pt-10">
        <div className="flex items-center gap-3">
          <span className="num">F—{String(total).padStart(2, "0")}</span>
          <span className="h-px w-8 bg-line" />
          <span className="label">Perguntas frequentes</span>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <h1 className="display max-w-[16ch] text-[clamp(1.75rem,4.4vw,3.5rem)]">
            O que a turma sempre pergunta.
          </h1>
          <p className="prose-sm max-w-sm">
            Se a sua dúvida não estiver aqui, ela provavelmente merece virar uma
            linha nesta página.
          </p>
        </div>
      </section>

      {GROUPS.map((group) => (
        <section key={group.index} className="shell grid gap-6 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="flex items-baseline gap-3">
              <span className="num">{group.index}</span>
              <h2 className="display text-[1.375rem] leading-none">{group.title}</h2>
            </div>
            <p className="prose-sm mt-2.5">{group.blurb}</p>
          </div>

          <div className="max-w-2xl border-t border-line">
            {group.entries.map((entry) => (
              <Question key={entry.q} entry={entry} />
            ))}
          </div>
        </section>
      ))}

      <section className="shell pb-14 pt-6">
        <div className="relative overflow-hidden border border-line px-6 py-10 md:px-10">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(70% 120% at 92% 0%, rgba(63,123,234,0.18), transparent 62%)",
            }}
          />
          <span className="label">Ficou faltando</span>
          <h2 className="display mt-3 max-w-lg text-[clamp(1.375rem,3vw,2.25rem)]">
            Pergunta que não está aqui é pergunta que ainda não foi feita.
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/contato" className="btn btn-solid">
              Mandar a dúvida
            </Link>
            <Link href="/sobre" className="btn btn-ghost">
              Como funciona
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
