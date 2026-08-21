"use client";

export type PdfPreview = {
  pages: number;
  coverBlob: Blob | null;
  coverUrl: string | null;
  /** Front matter, for the cataloguing assistant. Empty on scanned PDFs. */
  text: string;
};

/** Pages worth reading: cover, verso and the start of the contents. */
const TEXT_PAGES = 3;
const TEXT_LIMIT = 3600;

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
  let text = "";

  // The document is already open and parsed, so the excerpt costs almost
  // nothing on top of the page count we needed anyway.
  try {
    const parts: string[] = [];
    for (let number = 1; number <= Math.min(TEXT_PAGES, pages); number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      parts.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
      if (parts.join(" ").length > TEXT_LIMIT) break;
    }
    text = parts.join("\n").replace(/\s+/g, " ").trim().slice(0, TEXT_LIMIT);
  } catch {
    // A scan has no text layer; the assistant will say so.
  }

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
  return { pages, coverBlob, coverUrl, text };
}
