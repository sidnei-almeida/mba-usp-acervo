import Link from "next/link";
import type { Metadata } from "next";
import { DocShell, type DocSection } from "@/components/doc-shell";
import { SITE, policyDate } from "@/lib/site";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "As regras de uso do Silo, o acervo digital dos alunos do MBA em Data Science.",
};

const SECTIONS: DocSection[] = [
  {
    id: "o-que-e",
    title: "O que é o Silo",
    body: (
      <>
        <p>
          O Silo é um acervo digital mantido de forma voluntária por alunos e
          ex-alunos do MBA em Data Science. Reúne livros, apostilas, artigos, slides e
          estudos de caso em PDF que já circulam entre turmas, num endereço fixo
          e pesquisável.
        </p>
        <p>
          É uma iniciativa independente de estudantes. Não representa nenhuma
          instituição de ensino nem fala em nome de qualquer uma delas.
        </p>
      </>
    ),
  },
  {
    id: "consulta",
    title: "Consulta e download",
    body: (
      <>
        <p>
          Ler e baixar material não exige cadastro. Não há limite de banda por
          pessoa nem cobrança de qualquer espécie.
        </p>
        <p>
          O uso do material é pessoal e educacional. Redistribuir em escala,
          revender ou reempacotar o acervo como produto próprio está fora do que
          este espaço se propõe a permitir.
        </p>
      </>
    ),
  },
  {
    id: "conta",
    title: "Conta e responsabilidade",
    body: (
      <>
        <p>
          A conta existe para identificar quem enviou cada arquivo e permitir que
          essa pessoa corrija ou remova o próprio envio. Você responde pelo que
          acontece sob a sua conta e pela guarda da sua senha.
        </p>
        <p>
          Contas usadas para envio massivo de material irregular, spam ou
          tentativa de abuso da infraestrutura são encerradas sem aviso prévio.
        </p>
      </>
    ),
  },
  {
    id: "envio",
    title: "O que pode ser enviado",
    body: (
      <>
        <p>Ao enviar um arquivo, você declara ter direito de compartilhá-lo. Na prática:</p>
        <ul className="list-none space-y-1.5">
          <li className="border-l border-line pl-3">Produção própria — resumos, trabalhos, apresentações que você escreveu.</li>
          <li className="border-l border-line pl-3">Material distribuído pelo curso com autorização de repasse.</li>
          <li className="border-l border-line pl-3">Obras em domínio público ou sob licença aberta.</li>
          <li className="border-l border-line pl-3">Artigos científicos de acesso livre.</li>
        </ul>
        <p>
          Cópias digitalizadas de obras comerciais protegidas não têm lugar aqui,
          por mais úteis que sejam. Detalhes em{" "}
          <Link href="/sobre#direitos" className="underline-grow text-bone">
            direitos autorais
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "remocao",
    title: "Remoção de conteúdo",
    body: (
      <>
        <p>
          Autores, editoras e titulares de direito podem pedir a retirada de
          qualquer item. O pedido é atendido assim que recebido e verificado, sem
          exigência de ordem judicial prévia.
        </p>
        <p>
          Escreva para{" "}
          <a href={`mailto:${SITE.copyrightEmail}`} className="underline-grow text-bone">
            {SITE.copyrightEmail}
          </a>{" "}
          indicando o endereço da página e a obra envolvida. O passo a passo está
          na{" "}
          <Link href="/contato" className="underline-grow text-bone">
            página de contato
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "disponibilidade",
    title: "Disponibilidade e garantias",
    body: (
      <>
        <p>
          O serviço é oferecido como está, sem garantia de disponibilidade,
          integridade dos arquivos ou permanência do acervo. Manutenção,
          interrupções e mudanças de infraestrutura acontecem sem aviso.
        </p>
        <p>
          Guarde uma cópia própria do que for essencial para os seus estudos. O
          Silo é uma conveniência coletiva, não um sistema de backup.
        </p>
      </>
    ),
  },
  {
    id: "mudancas",
    title: "Mudanças nestes termos",
    body: (
      <p>
        Estes termos podem ser revistos conforme o acervo cresce. A data de
        revisão no topo da página é sempre a da versão em vigor, e o uso
        continuado depois de uma alteração significa concordância com ela.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <DocShell
      eyebrow="Documento"
      index="T—01"
      title="As regras de uma estante compartilhada."
      intro="O Silo funciona por acordo entre colegas. Estes termos escrevem esse acordo em voz alta: o que se pode consultar, o que se pode enviar e o que acontece quando algo entra por engano."
      meta={`Revisado em ${policyDate()}`}
      sections={SECTIONS}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="prose-sm max-w-md">
            Dúvida sobre um caso específico? Melhor perguntar antes de enviar.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/contato" className="btn btn-solid">
              Falar com a gente
            </Link>
            <Link href="/privacidade" className="btn btn-ghost">
              Privacidade
            </Link>
          </div>
        </div>
      }
    />
  );
}
