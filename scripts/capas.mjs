// Busca capas na Open Library para títulos que ainda não têm.
// Uso: node --env-file=.env scripts/capas.mjs [--aplicar]
import { neon } from "@neondatabase/serverless";

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error("Nenhuma URL de Postgres encontrada no ambiente.");
  process.exit(1);
}

const apply = process.argv.includes("--aplicar");
const sql = neon(url);

async function lookup({ titulo, autor, isbn }) {
  const params = new URLSearchParams();
  if (isbn) params.set("isbn", String(isbn).replace(/[^0-9Xx]/g, ""));
  else {
    params.set("title", titulo);
    if (autor) params.set("author", autor);
  }
  params.set("fields", "key,title,cover_i");
  params.set("limit", "3");

  const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: { "User-Agent": "AcervoMBAUSPEsalq/1.0 (biblioteca de alunos)" },
  });
  if (!response.ok) return null;

  const { docs = [] } = await response.json();
  const hit = docs.find((doc) => doc.cover_i);
  return hit ? `https://covers.openlibrary.org/b/id/${hit.cover_i}-L.jpg` : null;
}

const rows = await sql`
  select id, titulo, autores, isbn from livros
  where capa_url is null and formato = 'livro'
  order by criado_em desc
`;

console.log(`${rows.length} livro(s) sem capa remota.`);

for (const row of rows) {
  const autor = Array.isArray(row.autores) ? row.autores[0] : undefined;
  const cover = await lookup({ titulo: row.titulo, autor, isbn: row.isbn });

  if (!cover) {
    console.log(`— ${row.titulo}: nada na Open Library`);
    continue;
  }

  console.log(`${apply ? "✓" : "•"} ${row.titulo}: ${cover}`);
  if (apply) {
    await sql`
      update livros set capa_url = ${cover}, capa_fonte = 'openlibrary'
      where id = ${row.id}
    `;
  }
  // A Open Library pede parcimônia entre chamadas.
  await new Promise((resolve) => setTimeout(resolve, 350));
}

if (!apply) console.log("\nNada foi gravado. Rode com --aplicar para salvar.");
