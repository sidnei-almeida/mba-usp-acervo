import { NextResponse } from "next/server";
import { isContributor } from "@/lib/auth";
import { deleteBook, getBookById } from "@/lib/catalog";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const book = await getBookById(id);
  if (!book) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ book });
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isContributor())) {
    return NextResponse.json({ error: "Sessão não autorizada." }, { status: 401 });
  }
  const { id } = await context.params;
  const removed = await deleteBook(id);
  if (!removed) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
