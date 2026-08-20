import { nanoid } from "nanoid";
import { storage } from "@/lib/storage";
import type { Book, BookInput } from "@/lib/types";
import { accentFor, slugify } from "@/lib/utils";
import type { CatalogRepository } from "@/lib/catalog-repository";

const PREFIX = "catalogo/";
const INDEX_KEY = `${PREFIX}_index.json`;
const CACHE_TTL = 30_000;

let cache: { books: Book[]; at: number } | null = null;

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

async function writeIndex(books: Book[]) {
  const sorted = sortBooks(books);
  await storage().put(INDEX_KEY, JSON.stringify(sorted, null, 2), "application/json");
  cache = { books: sorted, at: Date.now() };
}

async function list(): Promise<Book[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.books;
  const books = (await readIndex()) ?? (await rebuildIndex());
  cache = { books: sortBooks(books), at: Date.now() };
  return cache.books;
}

/** Catalogue kept as JSON objects next to the files, for setups without a database. */
export const jsonCatalog: CatalogRepository = {
  list,

  invalidate() {
    cache = null;
  },

  async create(input: BookInput) {
    const books = await list();
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
  },

  async update(id: string, patch: Partial<Book>) {
    const books = await list();
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
  },

  async remove(id: string) {
    const books = await list();
    const current = books.find((book) => book.id === id);
    if (!current) return false;
    await Promise.all([
      storage().remove(`${PREFIX}${id}.json`),
      storage().remove(current.fileKey),
      current.coverKey ? storage().remove(current.coverKey) : Promise.resolve(),
    ]);
    await writeIndex(books.filter((book) => book.id !== id));
    return true;
  },

  async putMany(books: Book[]) {
    for (const book of books) {
      await storage().put(
        `${PREFIX}${book.id}.json`,
        JSON.stringify(book, null, 2),
        "application/json",
      );
    }
    await writeIndex(books);
  },
};
