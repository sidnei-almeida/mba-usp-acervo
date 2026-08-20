import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

const TIMEOUT_MS = 180_000;
const MIN_GAIN = 0.03;

export type OptimizeMethod = "ghostscript" | "qpdf" | "estrutural" | "original";

export type OptimizeResult = {
  bytes: Uint8Array;
  method: OptimizeMethod;
  originalSize: number;
  size: number;
  /** 0.42 means the file lost 42% of its weight. */
  saved: number;
};

function binary(name: "gs" | "qpdf") {
  const override =
    name === "gs" ? process.env.GHOSTSCRIPT_PATH : process.env.QPDF_PATH;
  return override ?? name;
}

async function run(command: string, args: string[]) {
  return new Promise<boolean>((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(false);
    }, TIMEOUT_MS);

    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

async function pageCount(bytes: Uint8Array) {
  try {
    const document = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return document.getPageCount();
  } catch {
    return null;
  }
}

/** A candidate only wins if it is smaller, valid, and kept every page. */
async function accept(candidate: Uint8Array, originalSize: number, pages: number | null) {
  if (candidate.byteLength === 0) return false;
  if (candidate.byteLength >= originalSize * (1 - MIN_GAIN)) return false;

  const candidatePages = await pageCount(candidate);
  if (candidatePages === null) return false;
  if (pages !== null && candidatePages !== pages) return false;
  return true;
}

/** Downsamples images and subsets fonts; text stays text. */
function ghostscriptArgs(input: string, output: string) {
  const dpi = Number(process.env.PDF_TARGET_DPI ?? 170);
  return [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.7",
    "-dPDFSETTINGS=/ebook",
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    "-dDetectDuplicateImages=true",
    "-dCompressFonts=true",
    "-dSubsetFonts=true",
    "-dAutoRotatePages=/None",
    "-dColorImageDownsampleType=/Bicubic",
    `-dColorImageResolution=${dpi}`,
    "-dGrayImageDownsampleType=/Bicubic",
    `-dGrayImageResolution=${dpi}`,
    "-dMonoImageDownsampleType=/Subsample",
    "-dMonoImageResolution=300",
    `-sOutputFile=${output}`,
    input,
  ];
}

/** Lossless: rewrites streams and packs objects, never touches image data. */
function qpdfArgs(input: string, output: string) {
  return [
    "--object-streams=generate",
    "--recompress-flate",
    "--compression-level=9",
    "--stream-data=compress",
    input,
    output,
  ];
}

/**
 * Tries the tools available on the host, from the most effective to the safest,
 * and keeps the smallest result that still parses with every page in place.
 * With no binaries around — a serverless host, say — it falls back to a
 * structural re-save, which still trims a badly written PDF.
 */
export async function optimizePdf(input: Uint8Array): Promise<OptimizeResult> {
  const originalSize = input.byteLength;
  const base: OptimizeResult = {
    bytes: input,
    method: "original",
    originalSize,
    size: originalSize,
    saved: 0,
  };

  if (process.env.PDF_OPTIMIZE === "false") return base;

  const pages = await pageCount(input);
  if (pages === null) return base;

  const directory = await mkdtemp(path.join(tmpdir(), "silo-pdf-"));
  const source = path.join(directory, "entrada.pdf");

  try {
    await writeFile(source, input);

    const attempts: { method: OptimizeMethod; file: string; args: string[]; command: string }[] = [
      {
        method: "ghostscript",
        command: binary("gs"),
        file: path.join(directory, "gs.pdf"),
        args: [],
      },
      {
        method: "qpdf",
        command: binary("qpdf"),
        file: path.join(directory, "qpdf.pdf"),
        args: [],
      },
    ];

    attempts[0].args = ghostscriptArgs(source, attempts[0].file);
    attempts[1].args = qpdfArgs(source, attempts[1].file);

    let best = base;

    for (const attempt of attempts) {
      if (!(await run(attempt.command, attempt.args))) continue;

      let candidate: Uint8Array;
      try {
        candidate = new Uint8Array(await readFile(attempt.file));
      } catch {
        continue;
      }

      if (!(await accept(candidate, best.size, pages))) continue;

      best = {
        bytes: candidate,
        method: attempt.method,
        originalSize,
        size: candidate.byteLength,
        saved: 1 - candidate.byteLength / originalSize,
      };
    }

    if (best.method === "original") {
      const structural = await structuralRewrite(input);
      if (structural && (await accept(structural, originalSize, pages))) {
        best = {
          bytes: structural,
          method: "estrutural",
          originalSize,
          size: structural.byteLength,
          saved: 1 - structural.byteLength / originalSize,
        };
      }
    }

    return best;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function structuralRewrite(input: Uint8Array) {
  try {
    const document = await PDFDocument.load(input, { ignoreEncryption: true });
    return await document.save({ useObjectStreams: true, addDefaultPage: false });
  } catch {
    return null;
  }
}
