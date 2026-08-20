import { NextResponse } from "next/server";
import { canManage, currentUser } from "@/lib/auth";
import { getBookById } from "@/lib/catalog";
import { optimizeStoredPdf } from "@/lib/pdf-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const book = await getBookById(id);
  if (!book) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  if (!canManage(await currentUser(), book.uploadedById)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  return NextResponse.json(await optimizeStoredPdf(id));
}
