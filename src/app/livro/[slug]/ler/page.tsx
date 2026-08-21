import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Download, X } from "lucide-react";
import { SiloGlyph } from "@/components/brand/silo-glyph";
import { getBookBySlug } from "@/lib/catalog";
import { KIND_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/livro/[slug]/ler">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  return { title: book ? `Lendo ${book.title}` : "Leitura" };
}

export default async function ReaderPage({ params }: PageProps<"/livro/[slug]/ler">) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0a0b0d]">
      {/*
        The reader covers the whole page, but the site chrome stays in the DOM
        behind it — 25 links and buttons a keyboard would still walk through.
        Removing them from the box tree takes them out of the tab order too.
      */}
      <style>{"#site-header,#site-footer,#site-librarian{display:none}"}</style>

      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line px-4">
        {/* The reader covers the site header, so the way home has to live here. */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="Início"
            className="grid h-8 w-8 shrink-0 place-items-center border border-line transition-colors hover:border-white/45"
          >
            <SiloGlyph className="h-4 w-4 text-bone" />
          </Link>

          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] uppercase tracking-[0.08em]">{book.title}</p>
            <p className="truncate text-[0.5625rem] uppercase tracking-[0.18em] text-dim">
              {KIND_LABEL[book.kind]} · {book.authors.join(", ")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`/api/arquivo/${book.fileKey}?download`}
            className="btn btn-ghost"
          >
            <Download className="h-4 w-4" strokeWidth={1.6} />
            <span className="hidden sm:inline">Baixar</span>
          </a>
          <Link
            href={`/livro/${book.slug}`}
            aria-label="Fechar leitor"
            className="grid h-9 w-9 place-items-center border border-line transition-colors hover:border-white/45"
          >
            <X className="h-4 w-4" strokeWidth={1.6} />
          </Link>
        </div>
      </header>

      <iframe
        src={`/api/arquivo/${book.fileKey}#view=FitH&toolbar=1`}
        title={`Leitor de ${book.title}`}
        className="min-h-0 flex-1 bg-[#1a1c1f]"
      />
    </div>
  );
}
