import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listBooks, updateBook } from "@/lib/catalog";
import { ingestCover } from "@/lib/cover-store";
import { bestCover } from "@/lib/covers";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Finds and stores missing covers for records already in the shelf.
 * Administrators only; used by `npm run capas`.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    limite?: number;
    refazer?: boolean;
  };
  const limit = Math.min(body.limite ?? 40, 100);

  const books = await listBooks();
  const pending = books
    .filter((book) => (body.refazer ? !book.coverKey : !book.coverKey && book.kind === "livro"))
    .slice(0, limit);

  const report: { title: string; status: string; source?: string }[] = [];

  for (const book of pending) {
    const url =
      book.coverUrl ??
      (
        await bestCover({
          title: book.title,
          author: book.authors[0],
          isbn: book.isbn,
          language: book.language.toLowerCase().startsWith("ing") ? "eng" : "por",
        })
      )?.coverUrl;

    if (!url) {
      report.push({ title: book.title, status: "sem capa nas fontes" });
      continue;
    }

    const coverKey = await ingestCover(book.id, url);
    if (!coverKey) {
      report.push({ title: book.title, status: "falha ao baixar" });
      continue;
    }

    await updateBook(book.id, {
      coverKey,
      coverUrl: url,
      coverSource: book.coverSource ?? "openlibrary",
    });
    report.push({ title: book.title, status: "guardada", source: url });
  }

  return NextResponse.json({
    analisados: pending.length,
    guardadas: report.filter((item) => item.status === "guardada").length,
    report,
  });
}
