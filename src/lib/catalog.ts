import { dbCatalog } from "@/lib/catalog-db";
import { jsonCatalog } from "@/lib/catalog-json";
import type { CatalogRepository } from "@/lib/catalog-repository";
import { isDatabaseConfigured } from "@/lib/db/client";
import { env } from "@/lib/env";
import type { Book, BookInput } from "@/lib/types";

export const FILE_PREFIX = "livros/";
export const COVER_PREFIX = "capas/";

function repository(): CatalogRepository {
  return isDatabaseConfigured() ? dbCatalog : jsonCatalog;
}

let seeding: Promise<void> | null = null;

async function ensureSeed(books: Book[]) {
  if (books.length > 0 || !env.seedDemo) return books;
  if (!seeding) {
    const { seedCatalog } = await import("@/lib/seed");
    seeding = seedCatalog().finally(() => {
      seeding = null;
    });
  }
  await seeding;
  repository().invalidate();
  return repository().list();
}

export async function listBooks(): Promise<Book[]> {
  return ensureSeed(await repository().list());
}

export function invalidateCatalog() {
  repository().invalidate();
}

export async function getBookBySlug(slug: string) {
  return (await listBooks()).find((book) => book.slug === slug) ?? null;
}

export async function getBookById(id: string) {
  return (await listBooks()).find((book) => book.id === id) ?? null;
}

export async function createBook(input: BookInput) {
  return repository().create(input);
}

export async function updateBook(id: string, patch: Partial<Book>) {
  return repository().update(id, patch);
}

export async function deleteBook(id: string) {
  return repository().remove(id);
}

export async function registerDownload(id: string) {
  const current = await getBookById(id);
  if (!current) return;
  await repository().update(id, { downloads: current.downloads + 1 });
}

export async function putSeedBooks(books: Book[]) {
  await repository().putMany(books);
}

export type CatalogQuery = {
  q?: string;
  discipline?: string;
  kind?: string;
  sort?: "recentes" | "titulo" | "populares" | "ano";
};

export function filterBooks(books: Book[], query: CatalogQuery) {
  const term = query.q?.trim().toLowerCase();
  let result = books;

  if (term) {
    result = result.filter((book) =>
      [book.title, book.subtitle, book.description, book.discipline, ...book.authors, ...book.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }
  if (query.discipline && query.discipline !== "todas") {
    result = result.filter((book) => book.discipline === query.discipline);
  }
  if (query.kind && query.kind !== "todos") {
    result = result.filter((book) => book.kind === query.kind);
  }

  switch (query.sort) {
    case "titulo":
      return [...result].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    case "populares":
      return [...result].sort((a, b) => b.downloads - a.downloads);
    case "ano":
      return [...result].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    default:
      return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function disciplinesOf(books: Book[]) {
  const counts = new Map<string, number>();
  for (const book of books) {
    counts.set(book.discipline, (counts.get(book.discipline) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

export function relatedBooks(books: Book[], book: Book, limit = 8) {
  return books
    .filter((candidate) => candidate.id !== book.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.discipline === book.discipline) score += 3;
      if (candidate.kind === book.kind) score += 1;
      score += candidate.tags.filter((tag) => book.tags.includes(tag)).length;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}
