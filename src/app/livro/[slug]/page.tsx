import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen, Download } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { BookRail } from "@/components/book-rail";
import { ContributorNote } from "@/components/contributor-note";
import { DeleteBook } from "@/components/delete-book";
import { EditBook } from "@/components/edit-book";
import { ShareButton } from "@/components/share-button";
import { canManage, currentUser } from "@/lib/auth";
import { isHouseAccount, resolveAvatarUrl } from "@/lib/avatar-url";
import { disciplinesOf, getBookBySlug, listBooks, relatedBooks } from "@/lib/catalog";
import { resolveCoverUrl, withCoverUrls } from "@/lib/cover-url";
import { KIND_LABEL } from "@/lib/types";
import { findUsersByIds } from "@/lib/users";
import { formatBytes, formatDate, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/livro/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: "Título não encontrado" };

  const description =
    book.description ?? `${book.title} — ${book.authors.join(", ")}`;
  const url = `/livro/${book.slug}`;

  return {
    title: book.title,
    description,
    alternates: { canonical: url },
    // A imagem sai de opengraph-image.tsx, ao lado deste arquivo.
    openGraph: {
      type: "book",
      title: book.title,
      description,
      url,
      siteName: "Silo",
      locale: "pt_BR",
      authors: book.authors,
    },
    twitter: {
      card: "summary_large_image",
      title: book.title,
      description,
    },
  };
}

export default async function BookPage({ params }: PageProps<"/livro/[slug]">) {
  const { slug } = await params;
  const found = await getBookBySlug(slug);
  if (!found) notFound();

  const book = { ...found, coverSrc: await resolveCoverUrl(found) };
  const books = await listBooks();
  const related = await withCoverUrls(relatedBooks(books, found));
  const manage = canManage(await currentUser(), book.uploadedById);

  // Seeded records carry a name but no account; those wear the house glyph.
  const uploader = book.uploadedById
    ? (await findUsersByIds([book.uploadedById])).get(book.uploadedById)
    : undefined;
  const uploaderPortrait = {
    house: isHouseAccount(uploader?.username ?? book.uploadedBy, uploader?.role),
    url: uploader ? await resolveAvatarUrl(uploader.avatarKey) : undefined,
  };
  const disciplines = manage ? disciplinesOf(books).map((entry) => entry.name) : [];

  const details = [
    { label: "Formato", value: KIND_LABEL[book.kind] },
    { label: "Área", value: book.discipline },
    { label: "Editora", value: book.publisher },
    { label: "Edição", value: book.edition },
    { label: "Ano", value: book.year ? String(book.year) : undefined },
    { label: "Idioma", value: book.language },
    { label: "Páginas", value: book.pages ? String(book.pages) : undefined },
    {
      label: "Arquivo",
      value:
        book.originalSize && book.originalSize > book.fileSize
          ? `${formatBytes(book.fileSize)} · −${Math.round(
              (1 - book.fileSize / book.originalSize) * 100,
            )}%`
          : formatBytes(book.fileSize),
    },
    { label: "No acervo desde", value: formatDate(book.createdAt) },
    { label: "Downloads", value: String(book.downloads) },
  ].filter((detail) => Boolean(detail.value));

  return (
    <article className="pt-[var(--header)]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-72"
        style={{
          background: `radial-gradient(60% 100% at 22% 0%, ${book.accent}59, transparent 70%)`,
        }}
      />

      <div className="shell pt-6">
        <Link
          href="/acervo"
          className="underline-grow inline-flex items-center gap-1.5 text-[0.625rem] uppercase tracking-[0.2em] text-muted hover:text-bone"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          Acervo
        </Link>
      </div>

      <div className="shell grid gap-8 pb-12 pt-6 lg:grid-cols-[13rem_1fr] lg:gap-14">
        <div className="mx-auto w-[45%] max-w-[12rem] lg:sticky lg:top-20 lg:mx-0 lg:w-full lg:max-w-none lg:self-start">
          <BookCover
            book={book}
            priority
            className="shadow-[0_30px_70px_-30px_rgba(0,0,0,0.95)]"
          />
          <div className="mt-4 flex flex-col gap-1.5">
            <Link href={`/livro/${book.slug}/ler`} className="btn btn-solid w-full">
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.6} />
              Ler agora
            </Link>
            <a href={`/api/arquivo/${book.fileKey}?download`} className="btn btn-ghost w-full">
              <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
              Baixar · {formatBytes(book.fileSize)}
            </a>
            <ShareButton title={book.title} />
            {manage ? (
              <div className="flex flex-col gap-2 pt-2">
                <DeleteBook id={book.id} title={book.title} />
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <span className="num">{book.year ?? "s.d."}</span>
            <span className="h-px w-6 bg-line" />
            <span className="label">
              {KIND_LABEL[book.kind]} ·{" "}
              <Link
                href={`/colecoes/${slugify(book.discipline)}`}
                className="underline-grow hover:text-bone"
              >
                {book.discipline}
              </Link>
            </span>
          </div>

          <h1 className="display mt-4 max-w-3xl text-[clamp(1.75rem,4vw,3.25rem)]">
            {book.title}
          </h1>
          {book.subtitle ? (
            <p className="mt-3 max-w-xl text-[0.9375rem] leading-snug text-[#b9bbbe]">
              {book.subtitle}
            </p>
          ) : null}
          <p className="label label-bone mt-4">{book.authors.join(" · ")}</p>

          {book.description ? (
            <p className="prose-sm mt-6 max-w-2xl text-[0.875rem]">{book.description}</p>
          ) : null}

          {book.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {book.tags.map((tag) => (
                <Link key={tag} href={`/acervo?q=${encodeURIComponent(tag)}`} className="chip">
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}

          <dl className="mt-9 grid grid-cols-1 gap-x-10 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-baseline justify-between gap-4 border-b border-line py-2"
              >
                <dt className="label">{detail.label}</dt>
                <dd className="text-[0.75rem] text-bone">{detail.value}</dd>
              </div>
            ))}
          </dl>

          {manage ? (
            <div className="mt-8">
              <EditBook book={book} disciplines={disciplines} />
            </div>
          ) : null}

          {book.uploadedBy ? (
            <ContributorNote
              name={book.uploadedBy}
              accent={book.accent}
              since={book.createdAt}
              avatarUrl={uploaderPortrait.house ? undefined : uploaderPortrait.url}
              house={uploaderPortrait.house}
            />
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <div className="border-t border-line">
          <BookRail
            title="Na mesma prateleira"
            index="Rel."
            books={related}
            href={`/colecoes/${slugify(book.discipline)}`}
          />
        </div>
      ) : null}
    </article>
  );
}
