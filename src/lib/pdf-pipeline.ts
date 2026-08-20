import { getBookById, updateBook } from "@/lib/catalog";
import { availableTools, optimizePdf } from "@/lib/pdf-optimize";
import { storage } from "@/lib/storage";

const MAX_MB = Number(process.env.PDF_OPTIMIZE_MAX_MB ?? 120);

export type PipelineReport = {
  id: string;
  title: string;
  status: "otimizado" | "já enxuto" | "grande demais" | "sem ferramentas" | "erro";
  method?: string;
  before?: number;
  after?: number;
  saved?: number;
};

async function readAll(stream: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = stream.getReader();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Fetches the stored PDF, runs it through the optimiser and writes the lighter
 * version back over the same key — so links, downloads and the reader keep
 * working while the bucket stops carrying the fat.
 */
export async function optimizeStoredPdf(bookId: string): Promise<PipelineReport> {
  const book = await getBookById(bookId);
  if (!book) return { id: bookId, title: bookId, status: "erro" };

  const base = { id: book.id, title: book.title };
  if (book.optimizedAt) return { ...base, status: "já enxuto", method: book.optimization };

  // Without gs or qpdf the only gain would be structural, which does not pay
  // for downloading and re-uploading the file — on Vercel Blob that traffic is
  // metered. The pre-upload tool handles those hosts instead.
  const tools = await availableTools();
  if (!tools.gs && !tools.qpdf) return { ...base, status: "sem ferramentas" };
  if (book.fileSize > MAX_MB * 1024 * 1024) return { ...base, status: "grande demais" };

  try {
    const object = await storage().get(book.fileKey);
    if (!object) return { ...base, status: "erro" };

    const input = await readAll(object.body);
    const result = await optimizePdf(input);

    if (result.method === "original") {
      await updateBook(book.id, {
        optimization: "original",
        optimizedAt: new Date().toISOString(),
        originalSize: input.byteLength,
      });
      return { ...base, status: "já enxuto", before: input.byteLength, after: input.byteLength };
    }

    await storage().put(book.fileKey, result.bytes, "application/pdf");
    await updateBook(book.id, {
      fileSize: result.size,
      originalSize: result.originalSize,
      optimization: result.method,
      optimizedAt: new Date().toISOString(),
    });

    return {
      ...base,
      status: "otimizado",
      method: result.method,
      before: result.originalSize,
      after: result.size,
      saved: result.saved,
    };
  } catch {
    return { ...base, status: "erro" };
  }
}
