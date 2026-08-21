import { NextResponse } from "next/server";
import { z } from "zod";
import { canManage, currentUser } from "@/lib/auth";
import { deleteBook, disciplinesOf, getBookById, listBooks, updateBook } from "@/lib/catalog";
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
import { KINDS } from "@/lib/types";

export const runtime = "nodejs";

/** Only the descriptive record is editable — never the file or the counters. */
const patchSchema = z.object({
  title: z.string().min(2).max(180).optional(),
  subtitle: z.string().max(180).optional(),
  authors: z.array(z.string().min(1)).min(1).max(12).optional(),
  year: z.number().int().min(1500).max(2100).nullable().optional(),
  publisher: z.string().max(120).optional(),
  edition: z.string().max(60).optional(),
  language: z.string().max(40).optional(),
  discipline: z.string().min(2).max(80).optional(),
  kind: z.enum(KINDS).optional(),
  tags: z.array(z.string().min(1).max(40)).max(12).optional(),
  description: z.string().max(2000).optional(),
  isbn: z.string().max(20).optional(),
  featured: z.boolean().optional(),
});

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const book = await getBookById(id);
  if (!book) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ book });
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const book = await getBookById(id);
  if (!book) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  if (!canManage(await currentUser(), book.uploadedById)) {
    return NextResponse.json(
      { error: "Só quem enviou o material (ou um administrador) pode removê-lo." },
      { status: 403 },
    );
  }

  await deleteBook(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const book = await getBookById(id);
  if (!book) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  if (!canManage(await currentUser(), book.uploadedById)) {
    return NextResponse.json(
      { error: "Só quem enviou o material (ou a curadoria) pode editá-lo." },
      { status: 403 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const known = disciplinesOf(await listBooks()).map((entry) => entry.name);

  // An edit passes through the same house style as a fresh submission. Empty
  // strings mean "clear this optional field", so they survive as undefined.
  const patch = {
    ...(input.title !== undefined && { title: normalizeTitle(input.title) }),
    ...(input.subtitle !== undefined && {
      subtitle: input.subtitle ? normalizeTitle(input.subtitle) : undefined,
    }),
    ...(input.authors !== undefined && { authors: normalizeAuthors(input.authors) }),
    ...(input.year !== undefined && { year: input.year ?? undefined }),
    ...(input.publisher !== undefined && {
      publisher: input.publisher ? normalizePublisher(input.publisher) : undefined,
    }),
    ...(input.edition !== undefined && {
      edition: input.edition ? normalizeEdition(input.edition) : undefined,
    }),
    ...(input.language !== undefined && { language: normalizeLanguage(input.language) }),
    ...(input.discipline !== undefined && {
      discipline: normalizeDiscipline(input.discipline, known),
    }),
    ...(input.kind !== undefined && { kind: input.kind }),
    ...(input.tags !== undefined && { tags: normalizeTags(input.tags) }),
    ...(input.description !== undefined && {
      description: input.description ? normalizeDescription(input.description) : undefined,
    }),
    ...(input.isbn !== undefined && {
      isbn: input.isbn ? normalizeIsbn(input.isbn) : undefined,
    }),
    ...(input.featured !== undefined && { featured: input.featured }),
  };

  const updated = await updateBook(id, patch);
  if (!updated) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });

  return NextResponse.json({ book: updated });
}
