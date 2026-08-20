// Compacta os PDFs do acervo usando o Ghostscript desta máquina e devolve a
// versão enxuta para o armazenamento. Rode onde o gs estiver instalado:
//   node --env-file=.env scripts/otimizar.mjs [--limite 20] [--simular]
//
// A Vercel não tem Ghostscript, então este é o caminho para ganhos de verdade
// quando o acervo vive no Vercel Blob.
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { head, put } from "@vercel/blob";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const current = process.argv[i];
  if (!current.startsWith("--")) continue;
  const next = process.argv[i + 1];
  args.set(current.replace(/^--/, ""), next && !next.startsWith("--") ? next : "true");
}

const dryRun = args.has("simular");
const limit = Number(args.get("limite") ?? 20);

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING;

const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!databaseUrl) {
  console.error("Sem URL de Postgres no ambiente.");
  process.exit(1);
}
if (!token) {
  console.error("Sem BLOB_READ_WRITE_TOKEN no ambiente (rode `vercel env pull`).");
  process.exit(1);
}

const sql = neon(databaseUrl);
const dpi = Number(process.env.PDF_TARGET_DPI ?? 170);

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ghostscript(input, output) {
  return new Promise((resolve) => {
    const child = spawn(process.env.GHOSTSCRIPT_PATH ?? "gs", [
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
    ], { stdio: "ignore" });

    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

async function pages(file) {
  return new Promise((resolve) => {
    const child = spawn("pdfinfo", [file]);
    let out = "";
    child.stdout?.on("data", (chunk) => {
      out += chunk;
    });
    child.on("error", () => resolve(null));
    child.on("close", () => {
      const match = out.match(/Pages:\s+(\d+)/);
      resolve(match ? Number(match[1]) : null);
    });
  });
}

async function urlFor(key) {
  const base = process.env.NEXT_PUBLIC_BLOB_BASE_URL?.replace(/\/$/, "");
  if (base) return `${base}/${key}`;
  const info = await head(key, { token });
  return info.url;
}

const rows = await sql`
  select id, titulo, arquivo_chave, arquivo_tamanho
  from livros
  where otimizado_em is null
  order by arquivo_tamanho desc
  limit ${limit}
`;

console.log(`${rows.length} arquivo(s) na fila.\n`);

let saved = 0;

for (const row of rows) {
  const directory = await mkdtemp(path.join(tmpdir(), "silo-opt-"));
  const source = path.join(directory, "entrada.pdf");
  const target = path.join(directory, "saida.pdf");

  try {
    const response = await fetch(await urlFor(row.arquivo_chave));
    if (!response.ok) {
      console.log(`· ${row.titulo} — não consegui baixar`);
      continue;
    }

    const original = Buffer.from(await response.arrayBuffer());
    await writeFile(source, original);

    if (!(await ghostscript(source, target))) {
      console.log(`· ${row.titulo} — ghostscript falhou`);
      continue;
    }

    const optimized = await readFile(target);
    const before = await pages(source);
    const after = await pages(target);

    if (before !== null && after !== null && before !== after) {
      console.log(`· ${row.titulo} — páginas mudaram (${before} → ${after}), mantido`);
      continue;
    }

    if (optimized.byteLength >= original.byteLength * 0.97) {
      console.log(`· ${row.titulo} — já estava enxuto`);
      if (!dryRun) {
        await sql`
          update livros
          set otimizacao = 'original', otimizado_em = now(),
              arquivo_tamanho_original = ${original.byteLength}
          where id = ${row.id}
        `;
      }
      continue;
    }

    const percent = Math.round((1 - optimized.byteLength / original.byteLength) * 100);
    console.log(
      `${dryRun ? "•" : "✓"} ${row.titulo} — ${mb(original.byteLength)} → ${mb(optimized.byteLength)} (−${percent}%)`,
    );
    saved += original.byteLength - optimized.byteLength;

    if (dryRun) continue;

    await put(row.arquivo_chave, optimized, {
      access: "public",
      contentType: "application/pdf",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    await sql`
      update livros
      set arquivo_tamanho = ${optimized.byteLength},
          arquivo_tamanho_original = ${original.byteLength},
          otimizacao = 'ghostscript',
          otimizado_em = now()
      where id = ${row.id}
    `;
  } catch (error) {
    console.log(`· ${row.titulo} — erro: ${error.message}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

console.log(`\n${mb(saved)} ${dryRun ? "economizáveis" : "economizados"}.`);
