// Compacta um PDF antes de enviá-lo ao acervo.
//   node scripts/preparar.mjs livro.pdf [outro.pdf ...] [--dpi 170] [--saida pasta]
//
// Gera "<nome>-otimizado.pdf" ao lado do original (ou na pasta indicada),
// conferindo que a contagem de páginas continua a mesma.
import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const files = [];
const options = new Map();

for (let i = 2; i < process.argv.length; i += 1) {
  const current = process.argv[i];
  if (current.startsWith("--")) {
    const next = process.argv[i + 1];
    options.set(current.replace(/^--/, ""), next && !next.startsWith("--") ? next : "true");
    if (next && !next.startsWith("--")) i += 1;
  } else {
    files.push(current);
  }
}

if (files.length === 0) {
  console.error("Uso: node scripts/preparar.mjs arquivo.pdf [...] [--dpi 170] [--saida pasta]");
  process.exit(1);
}

const dpi = Number(options.get("dpi") ?? process.env.PDF_TARGET_DPI ?? 170);
const outDir = options.get("saida");

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function exec(command, args) {
  return new Promise((resolve) => {
    let out = "";
    const child = spawn(command, args);
    child.stdout?.on("data", (chunk) => {
      out += chunk;
    });
    child.on("error", () => resolve({ ok: false, out }));
    child.on("close", (code) => resolve({ ok: code === 0, out }));
  });
}

async function pages(file) {
  const { ok, out } = await exec("pdfinfo", [file]);
  if (!ok) return null;
  const match = out.match(/Pages:\s+(\d+)/);
  return match ? Number(match[1]) : null;
}

const gs = process.env.GHOSTSCRIPT_PATH ?? "gs";
if (!(await exec(gs, ["--version"])).ok) {
  console.error(
    "Ghostscript não encontrado. Instale com `sudo pacman -S ghostscript` (ou o equivalente da sua distro).",
  );
  process.exit(1);
}

if (outDir) await mkdir(outDir, { recursive: true });

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const parsed = path.parse(file);
  const target = path.join(outDir ?? parsed.dir, `${parsed.name}-otimizado.pdf`);

  const before = (await stat(file).catch(() => null))?.size;
  if (!before) {
    console.log(`· ${file} — não encontrei o arquivo`);
    continue;
  }

  const done = await exec(gs, [
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
    `-sOutputFile=${target}`,
    file,
  ]);

  if (!done.ok) {
    console.log(`· ${parsed.base} — ghostscript falhou`);
    continue;
  }

  const after = (await stat(target)).size;
  const pagesBefore = await pages(file);
  const pagesAfter = await pages(target);

  if (pagesBefore !== null && pagesAfter !== null && pagesBefore !== pagesAfter) {
    console.log(`· ${parsed.base} — páginas mudaram (${pagesBefore} → ${pagesAfter}), descarte o resultado`);
    continue;
  }

  totalBefore += before;
  totalAfter += after;

  if (after >= before) {
    console.log(`· ${parsed.base} — já estava enxuto, envie o original`);
    continue;
  }

  const percent = Math.round((1 - after / before) * 100);
  console.log(`✓ ${parsed.base} — ${mb(before)} → ${mb(after)} (−${percent}%)  ${target}`);
}

if (totalBefore > 0) {
  const percent = Math.round((1 - totalAfter / totalBefore) * 100);
  console.log(`\nTotal: ${mb(totalBefore)} → ${mb(totalAfter)} (−${percent}%)`);
}
