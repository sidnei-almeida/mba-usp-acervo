export const KINDS = ["livro", "apostila", "artigo", "slides", "caso"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  livro: "Livro",
  apostila: "Apostila",
  artigo: "Artigo",
  slides: "Slides",
  caso: "Estudo de caso",
};

export type Book = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  authors: string[];
  year?: number;
  publisher?: string;
  edition?: string;
  language: string;
  discipline: string;
  kind: Kind;
  tags: string[];
  description?: string;
  pages?: number;
  fileKey: string;
  fileName: string;
  fileSize: number;
  isbn?: string;
  /** Remote artwork (Open Library); preferred over anything we store. */
  coverUrl?: string;
  coverSource?: CoverSource;
  /** First page rendered at upload time, used when there is no remote cover. */
  coverKey?: string;
  accent: string;
  uploadedById?: string;
  uploadedBy?: string;
  createdAt: string;
  featured?: boolean;
  downloads: number;
};

export const COVER_SOURCES = ["openlibrary", "googlebooks", "pdf", "gerada"] as const;
export type CoverSource = (typeof COVER_SOURCES)[number];

export type BookInput = Omit<
  Book,
  "id" | "slug" | "createdAt" | "downloads" | "accent"
> & {
  accent?: string;
};
