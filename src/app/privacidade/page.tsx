import Link from "next/link";
import type { Metadata } from "next";
import { DocShell, type DocSection } from "@/components/doc-shell";
import { SITE, policyDate } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "O que o Silo guarda, por quanto tempo e o que nunca chega até aqui.",
};

const SECTIONS: DocSection[] = [
  {
    id: "principio",
    title: "O princípio",
    body: (
      <>
        <p>
          Uma biblioteca não precisa saber quem folheia suas prateleiras. O Silo
          foi construído com esse princípio no código: consultar o acervo, ler um
          PDF e baixar um arquivo não exigem cadastro nem deixam rastro
          identificável.
        </p>
        <p>
          O que existe de dado pessoal aqui é o mínimo necessário para que quem
          envia um arquivo possa depois corrigi-lo ou removê-lo.
        </p>
      </>
    ),
  },
  {
    id: "sem-conta",
    title: "Visitando sem conta",
    body: (
      <>
        <p>
          Sem conta, nenhum cookie é gravado no seu navegador. Não há analytics,
          pixel de rastreio, mapa de calor ou script de terceiros na página.
        </p>
        <p>
          As fontes tipográficas são servidas pelo próprio domínio, então o
          carregamento da página não gera requisição para servidores de fonte
          externos.
        </p>
        <p>
          Capas e PDFs vêm do serviço de armazenamento do acervo, o que significa
          que o seu navegador se conecta a esse endereço para buscar o arquivo —
          como acontece com qualquer imagem hospedada fora do domínio principal.
        </p>
      </>
    ),
  },
  {
    id: "conta",
    title: "O que a conta guarda",
    body: (
      <>
        <p>
          O cadastro pede usuário e senha. Não pedimos e-mail, telefone, CPF,
          turma, foto ou qualquer documento.
        </p>
        <ul className="list-none space-y-1.5">
          <li className="border-l border-line pl-3">
            <span className="text-bone">Usuário</span> — o nome que aparece como
            responsável pelo envio.
          </li>
          <li className="border-l border-line pl-3">
            <span className="text-bone">Senha</span> — guardada apenas como hash
            scrypt com sal aleatório. Ninguém, incluindo quem mantém o acervo,
            consegue lê-la de volta.
          </li>
          <li className="border-l border-line pl-3">
            <span className="text-bone">Data de criação</span> — para ordenação e
            suporte.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "sessao",
    title: "Sessão e cookie",
    body: (
      <>
        <p>
          Ao entrar, um único cookie é gravado: <code className="text-bone">acervo_sessao</code>.
          Ele é <span className="text-bone">httpOnly</span> (JavaScript não o
          alcança), <span className="text-bone">sameSite lax</span>, assinado por
          HMAC e válido por 30 dias.
        </p>
        <p>
          O cookie carrega apenas o identificador da conta e a assinatura que o
          valida. Sair do acervo apaga o cookie imediatamente.
        </p>
      </>
    ),
  },
  {
    id: "contadores",
    title: "Contadores de download",
    body: (
      <p>
        Cada título tem um contador acumulado de downloads, usado no ranking de{" "}
        <Link href="/populares" className="underline-grow text-bone">
          mais baixados
        </Link>
        . É um número por obra, sem registro de quem baixou, quando ou de onde.
        Não há histórico de leitura por pessoa.
      </p>
    ),
  },
  {
    id: "terceiros",
    title: "Terceiros envolvidos",
    body: (
      <>
        <p>
          A infraestrutura usa serviços de hospedagem, banco de dados e
          armazenamento de arquivos. Esses provedores mantêm registros técnicos
          próprios — como logs de requisição — segundo suas próprias políticas.
        </p>
        <p>
          Nenhum dado do acervo é vendido, cedido para publicidade ou usado para
          treinar perfis comerciais.
        </p>
      </>
    ),
  },
  {
    id: "direitos",
    title: "Seus direitos",
    body: (
      <>
        <p>
          Você pode pedir a qualquer momento a correção do seu usuário, a
          exclusão da conta ou a remoção de um envio seu. A exclusão da conta é
          definitiva e não há período de retenção.
        </p>
        <p>
          Basta escrever para{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="underline-grow text-bone">
            {SITE.contactEmail}
          </a>
          .
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <DocShell
      eyebrow="Documento"
      index="P—01"
      title="Uma biblioteca não anota quem entra."
      intro="Esta página descreve exatamente o que o Silo grava, onde grava e por quanto tempo. É curta porque há pouca coisa para contar — e essa é a intenção."
      meta={`Revisado em ${policyDate()}`}
      sections={SECTIONS}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="prose-sm max-w-md">
            Encontrou algo nesta página que não bate com o comportamento real do
            acervo? Isso é um bug, e queremos saber.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/contato" className="btn btn-solid">
              Reportar
            </Link>
            <Link href="/termos" className="btn btn-ghost">
              Termos de uso
            </Link>
          </div>
        </div>
      }
    />
  );
}
