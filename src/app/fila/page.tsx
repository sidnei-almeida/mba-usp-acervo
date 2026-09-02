import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { DownloadButton } from "@/components/download-button";
import { listBooks } from "@/lib/catalog";
import { formatBytes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fila do acervo",
  description: "Espere a sua vez para baixar o arquivo.",
  robots: { index: false },
};

/**
 * Onde caem os links diretos para um arquivo quando não há vaga: em vez do erro
 * cru do armazenamento, a pessoa vê a fila e o download começa sozinho.
 */
export default async function FilaPage({ searchParams }: PageProps<"/fila">) {
  const { chave } = await searchParams;
  const key = typeof chave === "string" ? chave : "";
  const book = key ? (await listBooks()).find((item) => item.fileKey === key) : undefined;

  return (
    <div className="shell grid min-h-[70dvh] place-items-center py-16">
      <div className="w-full max-w-sm text-center">
        <span className="label">Fila do acervo</span>
        <h1 className="display mt-3 text-2xl">{book ? book.title : "Arquivo não encontrado"}</h1>

        {book ? (
          <>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
              O acervo entrega alguns arquivos por vez para caber no limite diário do
              armazenamento. Deixe esta página aberta: o download começa sozinho quando
              chegar a sua vez.
            </p>
            <DownloadButton
              chave={book.fileKey}
              rotulo={`Baixar · ${formatBytes(book.fileSize)}`}
              auto
              className="mt-6 text-left"
            />
            <Link
              href={`/livro/${book.slug}`}
              className="underline-grow mt-6 inline-flex items-center gap-1.5 text-[0.625rem] uppercase tracking-[0.2em] text-muted hover:text-bone"
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
              Página do livro
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
              Este link não aponta para nada no acervo. Talvez o arquivo tenha sido
              trocado por uma versão nova.
            </p>
            <Link href="/acervo" className="btn btn-solid mt-6">
              Ir para o acervo
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
