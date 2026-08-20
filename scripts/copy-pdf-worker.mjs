// Keeps a copy of the pdf.js worker in /public so the browser can load it from
// a stable URL regardless of bundler.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

try {
  const worker = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
  const target = path.join(process.cwd(), "public", "pdf.worker.min.mjs");
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(worker, target);
  console.log("pdf.js worker copiado para public/");
} catch (error) {
  console.warn("Não foi possível copiar o worker do pdf.js:", error.message);
}
