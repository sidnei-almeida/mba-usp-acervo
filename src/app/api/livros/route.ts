import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { createBook, filterBooks, listBooks } from "@/lib/catalog";
import { KINDS } from "@/lib/types";

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

  const book = await createBook({
    ...parsed.data,
    uploadedById: user.id,
    uploadedBy: user.name ?? user.username,
  });
  return NextResponse.json({ book }, { status: 201 });
}
