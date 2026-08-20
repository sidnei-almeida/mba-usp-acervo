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
  coverKey?: string;
  accent: string;
  uploadedById?: string;
  uploadedBy?: string;
  createdAt: string;
  featured?: boolean;
  downloads: number;
};

export type BookInput = Omit<
  Book,
  "id" | "slug" | "createdAt" | "downloads" | "accent"
> & {
  accent?: string;
};
