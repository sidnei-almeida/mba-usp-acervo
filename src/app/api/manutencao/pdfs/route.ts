import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listBooks } from "@/lib/catalog";
import { optimizeStoredPdf, type PipelineReport } from "@/lib/pdf-pipeline";

export const runtime = "nodejs";
/**
 * O teto do plano Hobby da Vercel é 300s; acima disso o build é recusado.
 * Como o lote pode ser maior do que cabe nesse tempo, o laço para sozinho
 * antes do limite e informa quantos sobraram, em vez de ser interrompido no
 * meio sem devolver relatório.
 */
export const maxDuration = 300;

/** Margem para serializar a resposta antes de a plataforma encerrar a função. */
const ORCAMENTO_MS = (maxDuration - 25) * 1000;

/** Runs the optimisation backlog. Administrators only; used by `npm run pdfs`. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { limite?: number };
  const limit = Math.min(body.limite ?? 10, 40);

  const pending = (await listBooks()).filter((book) => !book.optimizedAt).slice(0, limit);
  const report: PipelineReport[] = [];
  const comecou = Date.now();
  let restantes = 0;

  for (const [indice, book] of pending.entries()) {
    if (Date.now() - comecou > ORCAMENTO_MS) {
      restantes = pending.length - indice;
      break;
    }
    report.push(await optimizeStoredPdf(book.id));
  }

  const optimized = report.filter((item) => item.status === "otimizado");
  const savedBytes = optimized.reduce(
    (total, item) => total + ((item.before ?? 0) - (item.after ?? 0)),
    0,
  );

  return NextResponse.json({
    analisados: report.length,
    otimizados: optimized.length,
    bytesEconomizados: savedBytes,
    // Maior que zero significa que o tempo acabou: chame de novo para seguir.
    restantes,
    report,
  });
}
