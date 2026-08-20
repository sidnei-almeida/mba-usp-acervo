import { NextResponse } from "next/server";
import { canManage, currentUser } from "@/lib/auth";
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
