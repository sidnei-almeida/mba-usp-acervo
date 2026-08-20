import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen, Download } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { BookRail } from "@/components/book-rail";
import { DeleteBook } from "@/components/delete-book";
import { ShareButton } from "@/components/share-button";
import { isContributor } from "@/lib/auth";
import { getBookBySlug, listBooks, relatedBooks } from "@/lib/catalog";
import { KIND_LABEL } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/livro/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: "Título não encontrado" };
  return {
    title: book.title,
    description: book.description ?? `${book.title} — ${book.authors.join(", ")}`,
  };
}

export default async function BookPage({ params }: PageProps<"/livro/[slug]">) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const books = await listBooks();
  const related = relatedBooks(books, book);
  const canManage = await isContributor();

  const details = [
    { label: "Formato", value: KIND_LABEL[book.kind] },
    { label: "Área", value: book.discipline },
    { label: "Editora", value: book.publisher },
    { label: "Edição", value: book.edition },
    { label: "Ano", value: book.year ? String(book.year) : undefined },
    { label: "Idioma", value: book.language },
    { label: "Páginas", value: book.pages ? String(book.pages) : undefined },
    { label: "Arquivo", value: formatBytes(book.fileSize) },
    { label: "Enviado por", value: book.uploadedBy },
    { label: "No acervo desde", value: formatDate(book.createdAt) },
    { label: "Downloads", value: String(book.downloads) },
  ].filter((detail) => Boolean(detail.value));

  return (
    <article className="pt-[4.5rem]">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[32rem] -z-10"
          style={{
            background: `radial-gradient(80% 100% at 20% 0%, ${book.accent}66, transparent 70%)`,
          }}
        />

        <div className="shell pt-12">
          <Link
            href="/acervo"
            className="link-underline inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.2em] text-muted hover:text-bone"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Voltar ao acervo
          </Link>
        </div>

        <div className="shell grid gap-14 pb-20 pt-10 lg:grid-cols-[20rem_1fr] lg:gap-20 xl:grid-cols-[22rem_1fr]">
          <div className="mx-auto w-[62%] max-w-[18rem] lg:sticky lg:top-28 lg:mx-0 lg:w-full lg:max-w-none lg:self-start">
            <BookCover
              book={book}
              priority
              className="shadow-[0_50px_120px_-40px_rgba(0,0,0,0.95)]"
            />
            <div className="mt-8 flex flex-col gap-3">
              <Link href={`/livro/${book.slug}/ler`} className="btn btn-solid w-full">
                <BookOpen className="h-4 w-4" strokeWidth={1.6} />
                Ler agora
              </Link>
              <a
                href={`/api/arquivo/${book.fileKey}?download`}
                className="btn btn-ghost w-full"
              >
                <Download className="h-4 w-4" strokeWidth={1.6} />
                Baixar PDF · {formatBytes(book.fileSize)}
              </a>
              <ShareButton title={book.title} />
              {canManage ? (
                <div className="pt-2">
                  <DeleteBook id={book.id} title={book.title} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="max-w-3xl">
            <p className="eyebrow">
              {KIND_LABEL[book.kind]} · {book.discipline}
            </p>
            <h1 className="display mt-5 text-[clamp(2.25rem,5.5vw,4.25rem)]">
              {book.title}
            </h1>
            {book.subtitle ? (
              <p className="mt-5 text-lg leading-snug text-[#cfccc6] md:text-xl">
                {book.subtitle}
              </p>
            ) : null}
            <p className="mt-7 text-sm uppercase tracking-[0.16em] text-bone">
              {book.authors.join(" · ")}
            </p>

            {book.description ? (
              <p className="mt-10 max-w-2xl text-[1.0625rem] leading-[1.75] text-[#c2c0bb]">
                {book.description}
              </p>
            ) : null}

            {book.tags.length > 0 ? (
              <div className="mt-9 flex flex-wrap gap-2">
                {book.tags.map((tag) => (
                  <Link key={tag} href={`/acervo?q=${encodeURIComponent(tag)}`} className="chip">
                    {tag}
                  </Link>
                ))}
              </div>
            ) : null}

            <dl className="mt-14 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
              {details.map((detail) => (
                <div key={detail.label} className="bg-ink px-5 py-5">
                  <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-muted">
                    {detail.label}
                  </dt>
                  <dd className="mt-2 text-[0.9375rem] text-bone">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <div className="border-t border-line">
          <BookRail title="Na mesma prateleira" books={related} href="/acervo" />
        </div>
      ) : null}
    </article>
  );
}
