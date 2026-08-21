import "server-only";
import { publicUrl, storage } from "@/lib/storage";
import type { Book } from "@/lib/types";

/**
 * Resolves the address the browser should hit for a cover, on the server, so
 * the page ships a direct link instead of bouncing every thumbnail through a
 * redirect. Signed links are anchored to the day, which keeps them cacheable.
 */
export async function resolveCoverUrl(book: Book): Promise<string | undefined> {
  if (book.coverKey) {
    const direct = publicUrl(book.coverKey);
    if (direct) return direct;

    const signed = await storage().signedGetUrl(book.coverKey, undefined, {
      stable: true,
    });
    if (signed) return signed;

    return `/api/arquivo/${book.coverKey}`;
  }

  if (book.coverUrl) return `/api/capa?url=${encodeURIComponent(book.coverUrl)}`;
  return undefined;
}

/** Same thing for a list, signing in parallel. */
export async function withCoverUrls(books: Book[]): Promise<Book[]> {
  return Promise.all(
    books.map(async (book) => ({ ...book, coverSrc: await resolveCoverUrl(book) })),
  );
}
