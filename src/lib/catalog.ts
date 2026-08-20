import { nanoid } from "nanoid";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";
import type { Book, BookInput } from "@/lib/types";
import { accentFor, slugify } from "@/lib/utils";

const PREFIX = "catalogo/";
const INDEX_KEY = `${PREFIX}_index.json`;
const CACHE_TTL = 30_000;

export const FILE_PREFIX = "livros/";
export const COVER_PREFIX = "capas/";

let cache: { books: Book[]; at: number } | null = null;
let seeding: Promise<void> | null = null;

function sortBooks(books: Book[]) {
  return [...books].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function readIndex(): Promise<Book[] | null> {
  const raw = await storage().getText(INDEX_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Book[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function rebuildIndex(): Promise<Book[]> {
  const objects = await storage().list(PREFIX);
  const books: Book[] = [];
  for (const object of objects) {
    if (!object.key.endsWith(".json") || object.key === INDEX_KEY) continue;
    const raw = await storage().getText(object.key);
    if (!raw) continue;
    try {
      books.push(JSON.parse(raw) as Book);
    } catch {
      // ignore malformed records
    }
  }
  const sorted = sortBooks(books);
  await storage().put(INDEX_KEY, JSON.stringify(sorted, null, 2), "application/json");
  return sorted;
}

async function ensureSeed(books: Book[]) {
  if (books.length > 0 || !env.seedDemo) return books;
  if (!seeding) {
    const { seedCatalog } = await import("@/lib/seed");
    seeding = seedCatalog().finally(() => {
      seeding = null;
    });
  }
  await seeding;
  cache = null;
  return (await readIndex()) ?? [];
}

export async function listBooks(): Promise<Book[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.books;
  let books = (await readIndex()) ?? (await rebuildIndex());
  books = await ensureSeed(books);
  cache = { books: sortBooks(books), at: Date.now() };
  return cache.books;
}

export function invalidateCatalog() {
  cache = null;
}

export async function getBookBySlug(slug: string) {
  const books = await listBooks();
  return books.find((book) => book.slug === slug) ?? null;
}

export async function getBookById(id: string) {
  const books = await listBooks();
  return books.find((book) => book.id === id) ?? null;
}

async function writeIndex(books: Book[]) {
  const sorted = sortBooks(books);
  await storage().put(INDEX_KEY, JSON.stringify(sorted, null, 2), "application/json");
  cache = { books: sorted, at: Date.now() };
}

export async function createBook(input: BookInput): Promise<Book> {
  const books = await listBooks();
  const id = nanoid(10);
  let slug = slugify(input.title) || id;
  if (books.some((book) => book.slug === slug)) slug = `${slug}-${id.slice(0, 4)}`;

  const book: Book = {
    ...input,
    id,
    slug,
    accent: input.accent ?? accentFor(input.title + id),
    createdAt: new Date().toISOString(),
    downloads: 0,
  };

  await storage().put(
    `${PREFIX}${id}.json`,
    JSON.stringify(book, null, 2),
    "application/json",
  );
  await writeIndex([...books, book]);
  return book;
}

export async function updateBook(id: string, patch: Partial<Book>) {
  const books = await listBooks();
  const current = books.find((book) => book.id === id);
  if (!current) return null;
  const next = { ...current, ...patch, id: current.id, slug: current.slug };
  await storage().put(
    `${PREFIX}${id}.json`,
    JSON.stringify(next, null, 2),
    "application/json",
  );
  await writeIndex(books.map((book) => (book.id === id ? next : book)));
  return next;
}

export async function deleteBook(id: string) {
  const books = await listBooks();
  const current = books.find((book) => book.id === id);
  if (!current) return false;
  await Promise.all([
    storage().remove(`${PREFIX}${id}.json`),
    storage().remove(current.fileKey),
    current.coverKey ? storage().remove(current.coverKey) : Promise.resolve(),
  ]);
  await writeIndex(books.filter((book) => book.id !== id));
  return true;
}

export async function registerDownload(id: string) {
  const current = await getBookById(id);
  if (!current) return;
  await updateBook(id, { downloads: current.downloads + 1 });
}

/** Persist a record produced by the seeder without touching the index each time. */
export async function putSeedBooks(books: Book[]) {
  for (const book of books) {
    await storage().put(
      `${PREFIX}${book.id}.json`,
      JSON.stringify(book, null, 2),
      "application/json",
    );
  }
  await writeIndex(books);
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
      return sortBooks(result);
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
