import { env, isR2Configured } from "@/lib/env";
import { createLocalDriver } from "./local";
import { createR2Driver } from "./r2";

export type StoredObject = {
  key: string;
  size: number;
  lastModified?: string;
};

export type ObjectPayload = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  size?: number;
};

export interface StorageDriver {
  readonly name: "r2" | "local";
  put(key: string, body: Uint8Array | string, contentType: string): Promise<void>;
  get(key: string): Promise<ObjectPayload | null>;
  getText(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  list(prefix: string): Promise<StoredObject[]>;
  /** Returns null when the driver cannot hand out direct upload URLs. */
  signedPutUrl(key: string, contentType: string): Promise<string | null>;
  /** Returns null when reads must be proxied through the app. */
  signedGetUrl(key: string, downloadName?: string): Promise<string | null>;
}

let cached: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (cached) return cached;
  // Falls back to the filesystem so the app still runs without R2 credentials.
  cached = isR2Configured() ? createR2Driver() : createLocalDriver();
  return cached;
}

/** Public URL for an object, when the bucket is served by a custom domain. */
export function publicUrl(key: string): string | null {
  if (!env.r2.publicBaseUrl || !isR2Configured()) return null;
  return `${env.r2.publicBaseUrl}/${key}`;
}
