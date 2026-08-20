import { del, head, list, put } from "@vercel/blob";
import type { ObjectPayload, StorageDriver, StoredObject } from "./index";

const token = process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Public blob URLs share one host per store. It is learned from the first
 * answer the API gives us and reused after that, so reads cost no extra call.
 */
let base: string | null = process.env.NEXT_PUBLIC_BLOB_BASE_URL ?? null;

function rememberBase(url: string) {
  if (base) return;
  const parsed = new URL(url);
  base = `${parsed.protocol}//${parsed.host}`;
}

async function urlFor(key: string): Promise<string | null> {
  if (base) return `${base}/${key}`;
  try {
    const info = await head(key, { token });
    rememberBase(info.url);
    return info.url;
  } catch {
    return null;
  }
}

export function createBlobDriver(): StorageDriver {
  return {
    name: "blob",

    async put(key, body, contentType) {
      const result = await put(key, typeof body === "string" ? body : Buffer.from(body), {
        access: "public",
        contentType,
        token,
        // Our keys already carry a nanoid, so they are unguessable without a
        // random suffix — and staying deterministic keeps overwrites working.
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      rememberBase(result.url);
    },

    async get(key): Promise<ObjectPayload | null> {
      const url = await urlFor(key);
      if (!url) return null;

      const response = await fetch(url);
      if (!response.ok || !response.body) return null;

      return {
        body: response.body,
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
        size: Number(response.headers.get("content-length") ?? "0") || undefined,
      };
    },

    async getText(key) {
      const url = await urlFor(key);
      if (!url) return null;
      const response = await fetch(url, { cache: "no-store" });
      return response.ok ? response.text() : null;
    },

    async remove(key) {
      const url = await urlFor(key);
      if (url) await del(url, { token });
    },

    async list(prefix) {
      const objects: StoredObject[] = [];
      let cursor: string | undefined;

      do {
        const page = await list({ prefix, cursor, token, limit: 1000 });
        for (const item of page.blobs) {
          rememberBase(item.url);
          objects.push({
            key: item.pathname,
            size: item.size,
            lastModified: new Date(item.uploadedAt).toISOString(),
          });
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);

      return objects;
    },

    async signedPutUrl() {
      // Browser uploads go through the client-upload handshake instead.
      return null;
    },

    async signedGetUrl(key, downloadName) {
      const url = await urlFor(key);
      if (!url) return null;
      // `?download=1` makes the CDN answer with a Content-Disposition header.
      return downloadName ? `${url}?download=1` : url;
    },
  };
}
