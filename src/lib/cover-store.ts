import { COVER_PREFIX } from "@/lib/catalog";
import { storage } from "@/lib/storage";

const TIMEOUT_MS = 12000;
const MAX_BYTES = 3 * 1024 * 1024;

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Downloads a remote cover once and keeps it next to the PDFs. After this the
 * page never depends on Open Library or Google being up — or fast.
 */
export async function ingestCover(bookId: string, url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Silo/1.0 (acervo MBA Data Science)" },
    });
    if (!response.ok) return null;

    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    const extension = EXTENSION[type];
    if (!extension) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    // Providers answer missing artwork with a tiny placeholder pixel.
    if (bytes.byteLength < 1200 || bytes.byteLength > MAX_BYTES) return null;

    const key = `${COVER_PREFIX}${bookId}.${extension}`;
    await storage().put(key, bytes, type);
    return key;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
