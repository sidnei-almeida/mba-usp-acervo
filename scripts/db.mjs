// Inspeção rápida do banco: `node --env-file=.env scripts/db.mjs [--limpar-demo]`
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

const sql = neon(url);

const [{ version }] = await sql`select version()`;
console.log("postgres:", version.split(",")[0]);

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name
`;
console.log("tabelas:", tables.map((row) => row.table_name).join(", ") || "(nenhuma)");

for (const table of ["usuarios", "livros"]) {
  if (!tables.some((row) => row.table_name === table)) continue;
  const [{ total }] = await sql.query(`select count(*)::int as total from ${table}`);
  console.log(`${table}: ${total} linhas`);
}

if (process.argv.includes("--limpar-demo")) {
  const removed = await sql`delete from livros where id like 'demo-%' returning id`;
  console.log("títulos de demonstração removidos:", removed.length);
}
