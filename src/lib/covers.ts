import { normalize } from "@/lib/search";

const TIMEOUT_MS = 7000;

export type CoverProvider = "openlibrary" | "googlebooks";

export type CoverCandidate = {
  id: string;
  provider: CoverProvider;
  title: string;
  authors: string[];
  year?: number;
  publisher?: string;
  language?: string;
  coverUrl: string;
  thumbUrl: string;
  score: number;
};

export type CoverQuery = {
  title?: string;
  author?: string;
  isbn?: string;
  /** "por" or "eng"; only used to break ties. */
  language?: string;
};

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Silo/1.0 (acervo MBA USP/Esalq)" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Token overlap between what was asked and what the provider returned. */
function similarity(query: string, candidate: string) {
  const asked = new Set(normalize(query).split(/\W+/).filter((word) => word.length > 2));
  const got = new Set(normalize(candidate).split(/\W+/).filter((word) => word.length > 2));
  if (asked.size === 0 || got.size === 0) return 0;

  let shared = 0;
  for (const word of asked) if (got.has(word)) shared += 1;
  return shared / Math.max(asked.size, got.size);
}

// --- Open Library ----------------------------------------------------------

type OpenLibraryDoc = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  language?: string[];
  cover_i?: number;
};

function openLibraryParams(extra: Record<string, string>) {
  return new URLSearchParams({
    ...extra,
    fields: "key,title,author_name,first_publish_year,publisher,language,cover_i",
    limit: "8",
  });
}

async function openLibraryDocs(params: URLSearchParams) {
  const data = await getJson<{ docs?: OpenLibraryDoc[] }>(
    `https://openlibrary.org/search.json?${params}`,
  );
  return data?.docs ?? [];
}

async function fromOpenLibrary(query: CoverQuery): Promise<CoverCandidate[]> {
  const isbn = query.isbn?.replace(/[^0-9Xx]/g, "");
  const searches: URLSearchParams[] = [];

  if (isbn && isbn.length >= 10) {
    searches.push(openLibraryParams({ isbn }));
  } else if (query.title) {
    // The structured field is precise; the free-text one reaches translations
    // and editions the title index alone misses.
    const structured: Record<string, string> = { title: query.title };
    if (query.author) structured.author = query.author;
    searches.push(openLibraryParams(structured));
    searches.push(
      openLibraryParams({ q: [query.title, query.author].filter(Boolean).join(" ") }),
    );
  } else {
    return [];
  }

  const pages = await Promise.all(searches.map(openLibraryDocs));

  return pages
    .flat()
    .filter((doc) => doc.cover_i)
    .map((doc) => ({
      id: `ol:${doc.cover_i}`,
      provider: "openlibrary" as const,
      title: doc.title,
      authors: doc.author_name ?? [],
      year: doc.first_publish_year,
      publisher: doc.publisher?.[0],
      language: doc.language?.[0],
      coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
      thumbUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
      score: 0,
    }));
}

// --- Google Books ----------------------------------------------------------

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    publisher?: string;
    language?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

/** Google's thumbnails come small, http and curled; this cleans them up. */
function cleanGoogleImage(url: string, zoom: number) {
  return url
    .replace(/^http:/, "https:")
    .replace(/&edge=curl/, "")
    .replace(/zoom=\d/, `zoom=${zoom}`);
}

async function fromGoogleBooks(query: CoverQuery): Promise<CoverCandidate[]> {
  const isbn = query.isbn?.replace(/[^0-9Xx]/g, "");
  const terms = isbn && isbn.length >= 10
    ? `isbn:${isbn}`
    : [
        query.title ? `intitle:${JSON.stringify(query.title)}` : "",
        query.author ? `inauthor:${JSON.stringify(query.author)}` : "",
      ]
        .filter(Boolean)
        .join("+");

  if (!terms) return [];

  const params = new URLSearchParams({ q: terms, maxResults: "8", country: "BR" });
  // Anonymous access is rate-limited per IP; a key lifts the daily quota.
  if (process.env.GOOGLE_BOOKS_API_KEY) params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  const data = await getJson<{ items?: GoogleVolume[] }>(
    `https://www.googleapis.com/books/v1/volumes?${params}`,
  );

  return (data?.items ?? [])
    .filter((item) => item.volumeInfo?.imageLinks?.thumbnail)
    .map((item) => {
      const info = item.volumeInfo!;
      const raw = info.imageLinks!.thumbnail!;
      return {
        id: `gb:${item.id}`,
        provider: "googlebooks" as const,
        title: [info.title, info.subtitle].filter(Boolean).join(": "),
        authors: info.authors ?? [],
        year: info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : undefined,
        publisher: info.publisher,
        language: info.language,
        coverUrl: cleanGoogleImage(raw, 3),
        thumbUrl: cleanGoogleImage(raw, 1),
        score: 0,
      };
    });
}

// --- Public ----------------------------------------------------------------

/**
 * Both providers are queried in parallel: Open Library is stronger on English
 * editions, Google Books covers the Brazilian catalogue that OL simply lacks.
 */
export async function searchCovers(query: CoverQuery): Promise<CoverCandidate[]> {
  const [openLibrary, google] = await Promise.all([
    fromOpenLibrary(query),
    fromGoogleBooks(query),
  ]);

  const wanted = query.title ?? "";
  const wantedAuthor = query.author ?? "";
  const seen = new Set<string>();
  const scored: CoverCandidate[] = [];

  for (const candidate of [...openLibrary, ...google]) {
    const fingerprint = `${normalize(candidate.title)}|${normalize(candidate.authors[0] ?? "")}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    const titleScore = wanted ? similarity(wanted, candidate.title) : 0.5;
    const authorScore =
      wantedAuthor && candidate.authors.length > 0
        ? similarity(wantedAuthor, candidate.authors.join(" "))
        : 0;

    let score = titleScore * 10 + authorScore * 4;
    // A translated title shares no words with the original, so a confident
    // author match is what keeps the right book in the running.
    if (authorScore >= 0.5) score += 3;
    if (query.language && candidate.language === query.language) score += 2;
    // Google's Brazilian metadata is usually the closer match for pt-BR.
    if (candidate.provider === "googlebooks" && query.language === "por") score += 0.5;
    if (query.isbn) score += 3;

    scored.push({ ...candidate, score });
  }

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Rejects only confirmed failures. A slow or unreachable check returns true:
 * the page proxies covers and falls back on error, so optimism costs nothing
 * while a strict check would throw away perfectly good artwork.
 */
export async function verifyCover(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Silo/1.0 (acervo MBA USP/Esalq)" },
    });
    if ([403, 404, 410].includes(response.status)) return false;
    if (!response.ok) return true;

    const type = response.headers.get("content-type") ?? "";
    if (type && !type.startsWith("image/")) return false;

    // Open Library answers missing covers with a 1x1 placeholder.
    const length = Number(response.headers.get("content-length") ?? "0");
    return length === 0 || length > 1200;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export async function bestCover(query: CoverQuery) {
  const candidates = await searchCovers(query);
  // Below this the match is usually a different book with a similar word.
  const [first] = candidates.filter((item) => item.score >= 4);
  if (!first) return null;
  return (await verifyCover(first.coverUrl)) ? first : null;
}
