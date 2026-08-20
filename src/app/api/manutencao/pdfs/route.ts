import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listBooks } from "@/lib/catalog";
import { optimizeStoredPdf, type PipelineReport } from "@/lib/pdf-pipeline";

export const runtime = "nodejs";
export const maxDuration = 800;

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

  for (const book of pending) {
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
    report,
  });
}
