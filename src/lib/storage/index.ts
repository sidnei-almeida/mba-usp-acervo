import { env, isBlobConfigured, isS3Configured } from "@/lib/env";
import { createBlobDriver } from "./blob";
import { createLocalDriver } from "./local";
import { createS3Driver } from "./s3";

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
  readonly name: "s3" | "blob" | "local";
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
  // Vercel Blob, then any S3-compatible store, then the filesystem.
  cached = isBlobConfigured()
    ? createBlobDriver()
    : isS3Configured()
      ? createS3Driver()
      : createLocalDriver();
  return cached;
}

/** Public URL for an object, when the store is served straight from a CDN. */
export function publicUrl(key: string): string | null {
  if (isBlobConfigured() && env.blobBaseUrl) return `${env.blobBaseUrl}/${key}`;
  if (isS3Configured() && env.s3.publicBaseUrl) return `${env.s3.publicBaseUrl}/${key}`;
  return null;
}
