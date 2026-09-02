import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { listBooks } from "@/lib/catalog";
import {
  clientKey,
  noteStorageFailure,
  pressure,
  releaseSlot,
  requestSlot,
} from "@/lib/traffic/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  chave: z.string().min(1).max(300),
  leitura: z.boolean().optional(),
  senha: z.string().min(1).max(40).optional(),
  acao: z.enum(["pedir", "liberar", "falha"]).optional(),
  /** HTTP status the browser saw when the transfer failed, when it saw one. */
  codigo: z.number().int().optional(),
});

/** The status code that matches each answer, so fetch() callers can branch. */
const CODIGOS = {
  liberado: 200,
  fila: 202,
  pausa: 503,
  cota: 503,
  pessoal: 429,
  expirado: 410,
} as const;

export async function GET() {
  return NextResponse.json(await pressure(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const { chave, leitura = false, senha, acao = "pedir" } = parsed.data;

  if (acao === "liberar") {
    if (senha) await releaseSlot(senha);
    return new NextResponse(null, { status: 204 });
  }

  if (acao === "falha") {
    // The browser is the only witness of a transfer that went straight from
    // the bucket, so its report is what tells the shelf to step back.
    const pause = await noteStorageFailure(
      parsed.data.codigo ? `status ${parsed.data.codigo}` : "falha de transferência",
    );
    return NextResponse.json({ pausa: pause }, { status: 202 });
  }

  const book = (await listBooks()).find((item) => item.fileKey === chave);
  if (!book) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const user = await currentUser();
  const decision = await requestSlot({
    key: chave,
    bytes: book.fileSize,
    reading: leitura,
    client: clientKey(request, user?.id),
    ticket: senha,
  });

  const headers = new Headers({ "Cache-Control": "no-store" });
  if ("retryAfter" in decision) headers.set("Retry-After", String(decision.retryAfter));

  return NextResponse.json(decision, { status: CODIGOS[decision.status], headers });
}
