import type { Book, BookInput } from "@/lib/types";

/** Storage-agnostic contract shared by the Neon and JSON catalogues. */
export interface CatalogRepository {
  list(): Promise<Book[]>;
  invalidate(): void;
  create(input: BookInput): Promise<Book>;
  update(id: string, patch: Partial<Book>): Promise<Book | null>;
  remove(id: string): Promise<boolean>;
  /** Bulk write used by the demo seeder. */
  putMany(books: Book[]): Promise<void>;
}
