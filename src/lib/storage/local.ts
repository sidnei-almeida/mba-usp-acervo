import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { ObjectPayload, StorageDriver, StoredObject } from "./index";

const ROOT = path.join(process.cwd(), ".data");

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function resolve(key: string) {
  const target = path.join(ROOT, key);
  if (!target.startsWith(ROOT)) throw new Error("Chave inválida");
  return target;
}

function contentTypeFor(key: string) {
  return MIME[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}

async function walk(dir: string, base: string, out: StoredObject[]) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, base, out);
    } else {
      const info = await stat(full);
      out.push({
        key: path.relative(base, full).split(path.sep).join("/"),
        size: info.size,
        lastModified: info.mtime.toISOString(),
      });
    }
  }
}

/** Filesystem-backed driver used when R2 credentials are absent (local dev). */
export function createLocalDriver(): StorageDriver {
  return {
    name: "local",

    async put(key, body) {
      const target = resolve(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, typeof body === "string" ? body : Buffer.from(body));
    },

    async get(key): Promise<ObjectPayload | null> {
      const target = resolve(key);
      try {
        const info = await stat(target);
        const stream = Readable.toWeb(
          createReadStream(target),
        ) as ReadableStream<Uint8Array>;
        return { body: stream, contentType: contentTypeFor(key), size: info.size };
      } catch {
        return null;
      }
    },

    async getText(key) {
      try {
        return await readFile(resolve(key), "utf8");
      } catch {
        return null;
      }
    },

    async remove(key) {
      await rm(resolve(key), { force: true });
    },

    async list(prefix) {
      const out: StoredObject[] = [];
      await walk(ROOT, ROOT, out);
      return out.filter((object) => object.key.startsWith(prefix));
    },

    async signedPutUrl() {
      return null;
    },

    async signedGetUrl() {
      return null;
    },
  };
}
