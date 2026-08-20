import { NextResponse } from "next/server";
import { listBooks, registerDownload } from "@/lib/catalog";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_PREFIXES = ["livros/", "capas/"];

type Context = { params: Promise<{ key: string[] }> };

export async function GET(request: Request, context: Context) {
  const { key: segments } = await context.params;
  const key = segments.map((segment) => decodeURIComponent(segment)).join("/");

  if (!ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix)) || key.includes("..")) {
    return NextResponse.json({ error: "Chave inválida." }, { status: 400 });
  }

  const download = new URL(request.url).searchParams.has("download");
  const book = (await listBooks()).find((item) => item.fileKey === key);

  const signed = await storage().signedGetUrl(key, download ? book?.fileName : undefined);
  if (signed) {
    if (download && book) await registerDownload(book.id);
    return NextResponse.redirect(signed, 302);
  }

  const object = await storage().get(key);
  if (!object) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
  if (download && book) await registerDownload(book.id);

  const fileName = book?.fileName ?? key.split("/").pop() ?? "arquivo.pdf";
  const headers = new Headers({
    "Content-Type": object.contentType,
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
    "Cache-Control": "private, max-age=300",
  });
  if (object.size) headers.set("Content-Length", String(object.size));

  return new NextResponse(object.body, { headers });
}
