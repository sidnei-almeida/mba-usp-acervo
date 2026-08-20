import { neon } from "@neondatabase/serverless";

// Neon and Vercel hand out the same string under different names depending on
// how the project was created — accept all of them.
const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING;

export function isDatabaseConfigured() {
  return Boolean(url);
}

let client: ReturnType<typeof neon> | null = null;

export function sql() {
  if (!url) throw new Error("Nenhuma URL de Postgres configurada (DATABASE_URL/POSTGRES_URL).");
  if (!client) client = neon(url);
  return client;
}

let schema: Promise<void> | null = null;

/** Creates the tables on first use so a fresh Neon project just works. */
export function ensureSchema() {
  if (!schema) schema = bootstrap();
  return schema;
}

async function bootstrap() {
  const run = sql();

  await run`
    create table if not exists usuarios (
      id text primary key,
      usuario text unique not null,
      nome text,
      senha_hash text not null,
      papel text not null default 'membro',
      criado_em timestamptz not null default now()
    )
  `;

  await run`
    create table if not exists livros (
      id text primary key,
      slug text unique not null,
      titulo text not null,
      subtitulo text,
      autores jsonb not null default '[]'::jsonb,
      ano integer,
      editora text,
      edicao text,
      idioma text not null default 'Português',
      area text not null,
      formato text not null,
      tags jsonb not null default '[]'::jsonb,
      descricao text,
      paginas integer,
      arquivo_chave text not null,
      arquivo_nome text not null,
      arquivo_tamanho bigint not null,
      capa_chave text,
      cor text not null,
      enviado_por text references usuarios(id) on delete set null,
      enviado_por_nome text,
      destaque boolean not null default false,
      downloads integer not null default 0,
      criado_em timestamptz not null default now()
    )
  `;

  // Additive migrations for shelves created before remote covers existed.
  await run`alter table livros add column if not exists isbn text`;
  await run`alter table livros add column if not exists capa_url text`;
  await run`alter table livros add column if not exists capa_fonte text`;
  await run`alter table livros add column if not exists arquivo_tamanho_original bigint`;
  await run`alter table livros add column if not exists otimizacao text`;
  await run`alter table livros add column if not exists otimizado_em timestamptz`;

  await run`create index if not exists livros_area_idx on livros (area)`;
  await run`create index if not exists livros_criado_em_idx on livros (criado_em desc)`;
}
