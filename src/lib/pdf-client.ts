"use client";

export type PdfPreview = {
  pages: number;
  coverBlob: Blob | null;
  coverUrl: string | null;
};

/**
 * Reads the PDF in the browser to get its page count and to render page one as
 * the cover, so nothing heavy runs on the server.
 */
export async function readPdfPreview(file: File): Promise<PdfPreview> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const document = await task.promise;
  const pages = document.numPages;

  let coverBlob: Blob | null = null;
  let coverUrl: string | null = null;

  try {
    const page = await document.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1400 / base.height, 3);
    const viewport = page.getViewport({ scale });

    const canvas = window.document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      coverBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.86),
      );
      if (coverBlob) coverUrl = URL.createObjectURL(coverBlob);
    }
  } catch {
    // A missing cover is fine — the typographic fallback takes over.
  }

  await task.destroy();
  return { pages, coverBlob, coverUrl };
}
