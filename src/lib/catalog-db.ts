import { nanoid } from "nanoid";
import { ensureSchema, sql } from "@/lib/db/client";
import { storage } from "@/lib/storage";
import type { Book, BookInput, Kind } from "@/lib/types";
import { accentFor, slugify } from "@/lib/utils";
import type { CatalogRepository } from "@/lib/catalog-repository";

type Row = {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  autores: string[];
  ano: number | null;
  editora: string | null;
  edicao: string | null;
  idioma: string;
  area: string;
  formato: Kind;
  tags: string[];
  descricao: string | null;
  paginas: number | null;
  arquivo_chave: string;
  arquivo_nome: string;
  arquivo_tamanho: string | number;
  isbn: string | null;
  capa_url: string | null;
  capa_fonte: string | null;
  capa_chave: string | null;
  cor: string;
  enviado_por: string | null;
  enviado_por_nome: string | null;
  destaque: boolean;
  downloads: number;
  criado_em: string;
};

function toBook(row: Row): Book {
  return {
    id: row.id,
    slug: row.slug,
    title: row.titulo,
    subtitle: row.subtitulo ?? undefined,
    authors: row.autores ?? [],
    year: row.ano ?? undefined,
    publisher: row.editora ?? undefined,
    edition: row.edicao ?? undefined,
    language: row.idioma,
    discipline: row.area,
    kind: row.formato,
    tags: row.tags ?? [],
    description: row.descricao ?? undefined,
    pages: row.paginas ?? undefined,
    fileKey: row.arquivo_chave,
    fileName: row.arquivo_nome,
    fileSize: Number(row.arquivo_tamanho),
    isbn: row.isbn ?? undefined,
    coverUrl: row.capa_url ?? undefined,
    coverSource: (row.capa_fonte as Book["coverSource"]) ?? undefined,
    coverKey: row.capa_chave ?? undefined,
    accent: row.cor,
    uploadedById: row.enviado_por ?? undefined,
    uploadedBy: row.enviado_por_nome ?? undefined,
    featured: row.destaque,
    downloads: row.downloads,
    createdAt: new Date(row.criado_em).toISOString(),
  };
}

async function query() {
  await ensureSchema();
  return sql();
}

async function insert(book: Book) {
  const run = await query();
  await run`
    insert into livros (
      id, slug, titulo, subtitulo, autores, ano, editora, edicao, idioma, area,
      formato, tags, descricao, paginas, arquivo_chave, arquivo_nome,
      arquivo_tamanho, isbn, capa_url, capa_fonte, capa_chave, cor, enviado_por,
      enviado_por_nome, destaque, downloads, criado_em
    ) values (
      ${book.id}, ${book.slug}, ${book.title}, ${book.subtitle ?? null},
      ${JSON.stringify(book.authors)}::jsonb, ${book.year ?? null},
      ${book.publisher ?? null}, ${book.edition ?? null}, ${book.language},
      ${book.discipline}, ${book.kind}, ${JSON.stringify(book.tags)}::jsonb,
      ${book.description ?? null}, ${book.pages ?? null}, ${book.fileKey},
      ${book.fileName}, ${book.fileSize}, ${book.isbn ?? null},
      ${book.coverUrl ?? null}, ${book.coverSource ?? null},
      ${book.coverKey ?? null}, ${book.accent},
      ${book.uploadedById ?? null}, ${book.uploadedBy ?? null},
      ${book.featured ?? false}, ${book.downloads}, ${book.createdAt}
    )
    on conflict (id) do nothing
  `;
}

/** Catalogue persisted in Neon; the files themselves stay in R2. */
export const dbCatalog: CatalogRepository = {
  async list() {
    const run = await query();
    const rows = (await run`select * from livros order by criado_em desc`) as Row[];
    return rows.map(toBook);
  },

  invalidate() {
    // Every read hits Postgres, so there is nothing cached to drop.
  },

  async create(input: BookInput) {
    const run = await query();
    const id = nanoid(10);
    const base = slugify(input.title) || id;
    const taken = (await run`select slug from livros where slug like ${`${base}%`}`) as {
      slug: string;
    }[];
    const slug = taken.some((row) => row.slug === base) ? `${base}-${id.slice(0, 4)}` : base;

    const book: Book = {
      ...input,
      id,
      slug,
      accent: input.accent ?? accentFor(input.title + id),
      createdAt: new Date().toISOString(),
      downloads: 0,
    };

    await insert(book);
    return book;
  },

  async update(id, patch) {
    const run = await query();
    const rows = (await run`select * from livros where id = ${id}`) as Row[];
    if (rows.length === 0) return null;
    const next = { ...toBook(rows[0]), ...patch, id };

    await run`
      update livros set
        titulo = ${next.title},
        subtitulo = ${next.subtitle ?? null},
        autores = ${JSON.stringify(next.authors)}::jsonb,
        ano = ${next.year ?? null},
        editora = ${next.publisher ?? null},
        edicao = ${next.edition ?? null},
        idioma = ${next.language},
        area = ${next.discipline},
        formato = ${next.kind},
        tags = ${JSON.stringify(next.tags)}::jsonb,
        descricao = ${next.description ?? null},
        paginas = ${next.pages ?? null},
        isbn = ${next.isbn ?? null},
        capa_url = ${next.coverUrl ?? null},
        capa_fonte = ${next.coverSource ?? null},
        capa_chave = ${next.coverKey ?? null},
        cor = ${next.accent},
        destaque = ${next.featured ?? false},
        downloads = ${next.downloads}
      where id = ${id}
    `;
    return next;
  },

  async remove(id) {
    const run = await query();
    const rows = (await run`select * from livros where id = ${id}`) as Row[];
    if (rows.length === 0) return false;
    const book = toBook(rows[0]);

    await run`delete from livros where id = ${id}`;
    await Promise.all([
      storage().remove(book.fileKey),
      book.coverKey ? storage().remove(book.coverKey) : Promise.resolve(),
    ]);
    return true;
  },

  async putMany(books) {
    for (const book of books) await insert(book);
  },
};
