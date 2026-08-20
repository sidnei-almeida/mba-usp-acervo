import type { Book } from "@/lib/types";

export type SortKey = "recentes" | "titulo" | "populares" | "ano";

export type Filters = {
  q: string;
  discipline: string;
  kind: string;
  sort: SortKey;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  discipline: "todas",
  kind: "todos",
  sort: "recentes",
};

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export type Indexed = {
  book: Book;
  title: string;
  authors: string;
  tags: string;
  discipline: string;
  rest: string;
};

/** Built once per catalogue load so keystrokes only walk plain strings. */
export function buildIndex(books: Book[]): Indexed[] {
  return books.map((book) => ({
    book,
    title: normalize(`${book.title} ${book.subtitle ?? ""}`),
    authors: normalize(book.authors.join(" ")),
    tags: normalize(book.tags.join(" ")),
    discipline: normalize(book.discipline),
    rest: normalize(
      `${book.description ?? ""} ${book.publisher ?? ""} ${book.year ?? ""} ${book.isbn ?? ""}`,
    ),
  }));
}

function scoreEntry(entry: Indexed, term: string) {
  if (entry.title.startsWith(term)) return 6;
  if (entry.title.includes(` ${term}`)) return 5;
  if (entry.title.includes(term)) return 4;
  if (entry.authors.includes(term)) return 3;
  if (entry.tags.includes(term)) return 2.5;
  if (entry.discipline.includes(term)) return 1.5;
  if (entry.rest.includes(term)) return 1;
  return 0;
}

function bySort(sort: SortKey) {
  return (a: Book, b: Book) => {
    switch (sort) {
      case "titulo":
        return a.title.localeCompare(b.title, "pt-BR");
      case "populares":
        return b.downloads - a.downloads;
      case "ano":
        return (b.year ?? 0) - (a.year ?? 0);
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  };
}

export function runSearch(index: Indexed[], filters: Filters): Book[] {
  const terms = normalize(filters.q).split(/\s+/).filter(Boolean);
  const compare = bySort(filters.sort);

  const scored: { book: Book; score: number }[] = [];

  for (const entry of index) {
    if (filters.discipline !== "todas" && entry.book.discipline !== filters.discipline) {
      continue;
    }
    if (filters.kind !== "todos" && entry.book.kind !== filters.kind) continue;

    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      const value = scoreEntry(entry, term);
      if (value === 0) {
        matchedAll = false;
        break;
      }
      score += value;
    }
    if (!matchedAll) continue;

    scored.push({ book: entry.book, score });
  }

  // With a query, relevance leads and the chosen order breaks ties.
  scored.sort((a, b) =>
    terms.length > 0 && b.score !== a.score ? b.score - a.score : compare(a.book, b.book),
  );

  return scored.map((entry) => entry.book);
}

export function filtersFromParams(params: URLSearchParams): Filters {
  const sort = params.get("ordem");
  return {
    q: params.get("q") ?? "",
    discipline: params.get("disciplina") ?? "todas",
    kind: params.get("tipo") ?? "todos",
    sort: (["recentes", "titulo", "populares", "ano"] as const).includes(sort as SortKey)
      ? (sort as SortKey)
      : "recentes",
  };
}

export function paramsFromFilters(filters: Filters, view: string) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.discipline !== "todas") params.set("disciplina", filters.discipline);
  if (filters.kind !== "todos") params.set("tipo", filters.kind);
  if (filters.sort !== "recentes") params.set("ordem", filters.sort);
  if (view !== "grade") params.set("vista", view);
  return params;
}
