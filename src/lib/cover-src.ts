import type { Book } from "@/lib/types";

/**
 * The stored copy comes first — it is on our own storage and always there.
 * The remote URL is only a fallback for records ingested before the copy
 * existed, and it goes through the proxy.
 */
export function coverSrc(book: Pick<Book, "coverUrl" | "coverKey">) {
  const cdn = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  // With a public store the browser can hit the CDN directly — no redirect,
  // no function invocation per thumbnail.
  if (book.coverKey && cdn) return `${cdn}/${book.coverKey}`;
  if (book.coverKey) return `/api/arquivo/${book.coverKey}`;
  if (book.coverUrl) return `/api/capa?url=${encodeURIComponent(book.coverUrl)}`;
  return null;
}

/** Second chance used when the stored copy fails to load in the browser. */
export function coverFallbackSrc(book: Pick<Book, "coverUrl" | "coverKey">) {
  if (book.coverKey && book.coverUrl) {
    return `/api/capa?url=${encodeURIComponent(book.coverUrl)}`;
  }
  return null;
}
