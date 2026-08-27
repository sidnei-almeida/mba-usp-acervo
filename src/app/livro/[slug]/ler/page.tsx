import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PdfReader } from "@/components/pdf-reader";
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
    <PdfReader
      fileUrl={`/api/arquivo/${book.fileKey}`}
      title={book.title}
      subtitle={`${KIND_LABEL[book.kind]} · ${book.authors.join(", ")}`}
      backHref={`/livro/${book.slug}`}
    />
  );
}
