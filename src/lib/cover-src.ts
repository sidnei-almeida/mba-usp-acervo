import type { Book } from "@/lib/types";

/** Remote artwork always goes through our proxy; stored files are served directly. */
export function coverSrc(book: Pick<Book, "coverUrl" | "coverKey">) {
  if (book.coverUrl) return `/api/capa?url=${encodeURIComponent(book.coverUrl)}`;
  if (book.coverKey) return `/api/arquivo/${book.coverKey}`;
  return null;
}
