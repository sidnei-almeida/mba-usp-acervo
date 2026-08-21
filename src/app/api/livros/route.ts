import { NextResponse, after } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { createBook, disciplinesOf, filterBooks, listBooks, updateBook } from "@/lib/catalog";
import { ingestCover } from "@/lib/cover-store";
import {
  normalizeAuthors,
  normalizeDescription,
  normalizeDiscipline,
  normalizeEdition,
  normalizeIsbn,
  normalizeLanguage,
  normalizePublisher,
  normalizeTags,
  normalizeTitle,
} from "@/lib/normalize";
import { optimizeStoredPdf } from "@/lib/pdf-pipeline";
import { COVER_SOURCES, KINDS } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(2).max(180),
  subtitle: z.string().max(180).optional(),
  authors: z.array(z.string().min(1)).min(1).max(12),
  year: z.number().int().min(1500).max(2100).optional(),
  publisher: z.string().max(120).optional(),
  edition: z.string().max(60).optional(),
  language: z.string().max(40).default("Português"),
  discipline: z.string().min(2).max(80),
  kind: z.enum(KINDS),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  description: z.string().max(2000).optional(),
  pages: z.number().int().min(1).max(20000).optional(),
  fileKey: z.string().min(3),
  fileName: z.string().min(1),
  fileSize: z.number().int().min(1),
  isbn: z.string().max(20).optional(),
  coverUrl: z.string().url().max(300).optional(),
  coverSource: z.enum(COVER_SOURCES).optional(),
  coverKey: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const books = await listBooks();
  const result = filterBooks(books, {
    q: url.searchParams.get("q") ?? undefined,
    discipline: url.searchParams.get("disciplina") ?? undefined,
    kind: url.searchParams.get("tipo") ?? undefined,
    sort: (url.searchParams.get("ordem") as never) ?? undefined,
  });
  return NextResponse.json({ total: result.length, books: result });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Entre na sua conta para enviar." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // House style is applied here, not in the form: the contributor should not
  // have to fight formatting rules to get a file onto the shelf.
  const input = parsed.data;
  const known = disciplinesOf(await listBooks()).map((entry) => entry.name);

  const book = await createBook({
    ...input,
    title: normalizeTitle(input.title),
    subtitle: input.subtitle ? normalizeTitle(input.subtitle) : undefined,
    authors: normalizeAuthors(input.authors),
    publisher: input.publisher ? normalizePublisher(input.publisher) : undefined,
    edition: input.edition ? normalizeEdition(input.edition) : undefined,
    isbn: input.isbn ? normalizeIsbn(input.isbn) : undefined,
    language: normalizeLanguage(input.language),
    discipline: normalizeDiscipline(input.discipline, known),
    tags: normalizeTags(input.tags),
    description: input.description ? normalizeDescription(input.description) : undefined,
    uploadedById: user.id,
    uploadedBy: user.name ?? user.username,
  });

  // The heavy pass runs after the response: publishing stays instant and the
  // bucket still ends up with the lighter file.
  after(() => optimizeStoredPdf(book.id));

  // Keeps a copy of the chosen artwork so the record stops depending on the
  // provider being reachable later.
  if (book.coverUrl && !book.coverKey) {
    const coverKey = await ingestCover(book.id, book.coverUrl);
    if (coverKey) {
      const updated = await updateBook(book.id, { coverKey });
      if (updated) return NextResponse.json({ book: updated }, { status: 201 });
    }
  }

  return NextResponse.json({ book }, { status: 201 });
}
