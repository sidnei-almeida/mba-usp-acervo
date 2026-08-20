const SEARCH_URL = "https://openlibrary.org/search.json";
const COVERS_URL = "https://covers.openlibrary.org/b/id";
const TIMEOUT_MS = 6000;

export type CoverCandidate = {
  key: string;
  title: string;
  authors: string[];
  year?: number;
  publisher?: string;
  coverId: number;
  coverUrl: string;
  thumbUrl: string;
};

type SearchDoc = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  cover_i?: number;
};

export function coverUrlFor(coverId: number, size: "S" | "M" | "L" = "L") {
  return `${COVERS_URL}/${coverId}-${size}.jpg`;
}

async function request(params: URLSearchParams): Promise<SearchDoc[]> {
  params.set("fields", "key,title,author_name,first_publish_year,publisher,cover_i");
  params.set("limit", "10");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${SEARCH_URL}?${params}`, {
      signal: controller.signal,
      headers: { "User-Agent": "AcervoMBAUSPEsalq/1.0 (biblioteca de alunos)" },
      // Open Library answers slowly; a day of cache is plenty for artwork.
      next: { revalidate: 86400 },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { docs?: SearchDoc[] };
    return data.docs ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function toCandidate(doc: SearchDoc): CoverCandidate | null {
  if (!doc.cover_i) return null;
  return {
    key: doc.key,
    title: doc.title,
    authors: doc.author_name ?? [],
    year: doc.first_publish_year,
    publisher: doc.publisher?.[0],
    coverId: doc.cover_i,
    coverUrl: coverUrlFor(doc.cover_i, "L"),
    thumbUrl: coverUrlFor(doc.cover_i, "M"),
  };
}

/** Looks for artwork on Open Library: ISBN first, then title plus author. */
export async function searchCovers(input: {
  title?: string;
  author?: string;
  isbn?: string;
}): Promise<CoverCandidate[]> {
  const isbn = input.isbn?.replace(/[^0-9Xx]/g, "");

  if (isbn && isbn.length >= 10) {
    const byIsbn = await request(new URLSearchParams({ isbn }));
    const found = byIsbn.map(toCandidate).filter(Boolean) as CoverCandidate[];
    if (found.length > 0) return found;
  }

  const title = input.title?.trim();
  if (!title) return [];

  const params = new URLSearchParams({ title });
  if (input.author?.trim()) params.set("author", input.author.trim());

  let docs = await request(params);
  if (docs.length === 0 && input.author?.trim()) {
    docs = await request(new URLSearchParams({ title }));
  }

  return docs.map(toCandidate).filter(Boolean) as CoverCandidate[];
}

export async function bestCover(input: {
  title?: string;
  author?: string;
  isbn?: string;
}) {
  const [first] = await searchCovers(input);
  return first ?? null;
}
