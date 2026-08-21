import type { Book, Kind } from "@/lib/types";
import { KINDS } from "@/lib/types";
import { slugify } from "@/lib/utils";

const DAY = 86_400_000;

/**
 * How long a title holds the hero. Short enough that the shelf visibly turns
 * over during an afternoon, long enough that clicking back to the home page
 * does not swap the artwork under the visitor mid-navigation.
 */
export const HERO_SLOT_MINUTES = 15;

/**
 * The current rotation slot. Everything that rotates seeds off this string, so
 * every request inside the same slot picks the same title.
 */
export function catalogSlot(now: Date = new Date(), minutes = HERO_SLOT_MINUTES) {
  return String(Math.floor(now.getTime() / (minutes * 60_000)));
}

function seedFrom(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function ageInDays(book: Book, now: number) {
  const at = Date.parse(book.createdAt);
  return Number.isNaN(at) ? 9999 : Math.max(0, (now - at) / DAY);
}

export type Scored = { book: Book; score: number };

/**
 * What earns the hero. Reach and freshness carry the weight; the rest are
 * presentation gates, because the hero is the one slot where a title without
 * artwork or a blurb looks broken.
 */
export function rankForHero(books: Book[], now = Date.now()): Scored[] {
  const ceiling = Math.max(1, ...books.map((book) => book.downloads));

  return books
    .map((book) => {
      const freshness = Math.max(0, 1 - ageInDays(book, now) / 180);
      const reach = book.downloads / ceiling;

      let score = freshness * 3 + reach * 3;
      if (book.coverKey || book.coverUrl) score += 2;
      if (book.description) score += 1;
      if (book.subtitle) score += 0.25;
      if ((book.pages ?? 0) >= 40) score += 0.5;
      // A hand-picked title gets a push, never a permanent seat.
      if (book.featured) score += 2;

      return { book, score };
    })
    .sort((a, b) => b.score - a.score || a.book.id.localeCompare(b.book.id));
}

export const HERO_POOL = 7;

/** Best few titles form a pool; the current slot picks one out of it. */
export function heroBook(books: Book[], slot = catalogSlot()): Book | null {
  if (books.length === 0) return null;
  const pool = rankForHero(books).slice(0, Math.min(HERO_POOL, books.length));
  return pool[seedFrom(slot) % pool.length].book;
}

export type Collection = {
  slug: string;
  name: string;
  count: number;
  pages: number;
  downloads: number;
  years: number[];
  authors: { name: string; count: number }[];
  kinds: { kind: Kind; count: number }[];
  books: Book[];
};

function buildCollection(name: string, books: Book[]): Collection {
  const authors = new Map<string, number>();
  for (const book of books) {
    for (const author of book.authors) {
      authors.set(author, (authors.get(author) ?? 0) + 1);
    }
  }

  return {
    slug: slugify(name),
    name,
    count: books.length,
    pages: books.reduce((total, book) => total + (book.pages ?? 0), 0),
    downloads: books.reduce((total, book) => total + book.downloads, 0),
    years: books.map((book) => book.year).filter((year): year is number => Boolean(year)),
    authors: [...authors.entries()]
      .map(([author, count]) => ({ name: author, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR")),
    kinds: KINDS.map((kind) => ({
      kind,
      count: books.filter((book) => book.kind === kind).length,
    })).filter((entry) => entry.count > 0),
    books,
  };
}

/** Every discipline as a first-class shelf, biggest first. */
export function collectionsOf(books: Book[]): Collection[] {
  const grouped = new Map<string, Book[]>();
  for (const book of books) {
    const bucket = grouped.get(book.discipline);
    if (bucket) bucket.push(book);
    else grouped.set(book.discipline, [book]);
  }

  return [...grouped.entries()]
    .map(([name, items]) => buildCollection(name, items))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

export function collectionBySlug(books: Book[], slug: string): Collection | null {
  return collectionsOf(books).find((collection) => collection.slug === slug) ?? null;
}

/** Neighbours of a shelf: whatever else the same authors and tags reach. */
export function neighbourCollections(all: Collection[], current: Collection, limit = 3) {
  const authors = new Set(current.authors.map((author) => author.name));
  const tags = new Set(current.books.flatMap((book) => book.tags));

  return all
    .filter((collection) => collection.slug !== current.slug)
    .map((collection) => {
      let score = 0;
      for (const author of collection.authors) {
        if (authors.has(author.name)) score += 2;
      }
      for (const book of collection.books) {
        score += book.tags.filter((tag) => tags.has(tag)).length * 0.5;
      }
      return { collection, score };
    })
    .sort((a, b) => b.score - a.score || b.collection.count - a.collection.count)
    .slice(0, limit)
    .map((entry) => entry.collection);
}

export type Ranked = { book: Book; position: number; share: number };

/** Download ranking with each title's share of the leader, for the bars. */
export function rankByDownloads(books: Book[]): Ranked[] {
  const sorted = [...books].sort(
    (a, b) => b.downloads - a.downloads || a.title.localeCompare(b.title, "pt-BR"),
  );
  const leader = Math.max(1, sorted[0]?.downloads ?? 0);

  return sorted.map((book, index) => ({
    book,
    position: index + 1,
    share: book.downloads / leader,
  }));
}
