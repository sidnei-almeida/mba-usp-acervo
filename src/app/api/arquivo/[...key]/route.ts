import { NextResponse } from "next/server";
import { listBooks, registerDownload } from "@/lib/catalog";
import { storage } from "@/lib/storage";
import { holdsSlot, noteRead, noteStorageFailure, storageBlocked } from "@/lib/traffic/gate";

export const runtime = "nodejs";

const ALLOWED_PREFIXES = ["livros/", "capas/", "avatares/"];
/** Only the books are metered — a cover is a few kilobytes, a book is a few
 *  hundred megabytes, and it is the books that empty the bucket's daily quota. */
const METERED_PREFIX = "livros/";
/** Rough size of a cover, used to keep the day's budget honest without paying
 *  an extra request to the bucket just to ask how big the image is. */
const COVER_ESTIMATE = 60 * 1024;

type Context = { params: Promise<{ key: string[] }> };

function wantsPage(request: Request) {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

export async function GET(request: Request, context: Context) {
  const { key: segments } = await context.params;
  const key = segments.map((segment) => decodeURIComponent(segment)).join("/");

  if (!ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix)) || key.includes("..")) {
    return NextResponse.json({ error: "Chave inválida." }, { status: 400 });
  }

  const url = new URL(request.url);
  const download = url.searchParams.has("download");
  const metered = key.startsWith(METERED_PREFIX);

  // A book only leaves the bucket with a place in line. Anyone arriving with a
  // bare link — a shared address, an old tab — is sent to the queue page
  // instead of meeting a raw storage error.
  if (metered && !(await holdsSlot(url.searchParams.get("t"), key))) {
    const destino = `/fila?chave=${encodeURIComponent(key)}${download ? "&modo=baixar" : ""}`;
    if (wantsPage(request)) return NextResponse.redirect(new URL(destino, url), 302);
    return NextResponse.json(
      { error: "Sem vaga para esta transferência.", status: "sem-vaga", fila: destino },
      { status: 403 },
    );
  }

  if (!metered) {
    // Covers and portraits are not queued, but they still spend the same daily
    // allowance — when it is gone, say so instead of letting the bucket answer.
    const blocked = await storageBlocked();
    if (blocked) {
      return NextResponse.json(
        { error: blocked.message, status: blocked.status },
        { status: 503, headers: { "Retry-After": String(blocked.retryAfter) } },
      );
    }
    await noteRead(COVER_ESTIMATE);
  }

  const book = (await listBooks()).find((item) => item.fileKey === key);

  try {
    const signed = await storage().signedGetUrl(key, download ? book?.fileName : undefined, {
      // A cover keeps the same address all day, so the browser caches it
      // instead of pulling the same image out of the bucket every ten minutes.
      stable: !metered,
    });
    if (signed) {
      if (download && book) await registerDownload(book.id);
      const response = NextResponse.redirect(signed, 302);
      // Shorter than the signature lifetime, so a cached redirect never points
      // at an expired URL.
      if (!download) {
        response.headers.set("Cache-Control", metered ? "private, max-age=600" : "private, max-age=86400");
      }
      return response;
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
  } catch (error) {
    // The bucket refusing us is the last warning before it goes dark: park the
    // whole shelf for a few minutes and tell the reader what happened.
    const pause = await noteStorageFailure(error);
    return NextResponse.json(
      {
        error: pause
          ? "O armazenamento atingiu o limite do plano gratuito. Tente de novo em alguns minutos."
          : "Não foi possível trazer este arquivo agora.",
        status: pause ? "pausa" : "erro",
      },
      { status: 503, headers: pause ? { "Retry-After": "300" } : undefined },
    );
  }
}
