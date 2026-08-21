import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import type { ObjectPayload, StorageDriver, StoredObject } from "./index";

const SIGNED_URL_TTL = 60 * 15;

function client() {
  return new S3Client({
    region: env.s3.region,
    endpoint: env.s3.endpoint,
    credentials: {
      accessKeyId: env.s3.accessKeyId!,
      secretAccessKey: env.s3.secretAccessKey!,
    },
  });
}

/**
 * Works with any S3-compatible store — Cloudflare R2 and Backblaze B2 alike.
 * With a private bucket every read is a presigned URL, which costs nothing
 * extra on either provider.
 */
export function createS3Driver(): StorageDriver {
  const s3 = client();
  const Bucket = env.s3.bucket!;

  return {
    name: "s3",

    async put(key, body, contentType) {
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: typeof body === "string" ? body : Buffer.from(body),
          ContentType: contentType,
        }),
      );
    },

    async get(key): Promise<ObjectPayload | null> {
      try {
        const result = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
        if (!result.Body) return null;
        return {
          body: result.Body.transformToWebStream(),
          contentType: result.ContentType ?? "application/octet-stream",
          size: result.ContentLength,
        };
      } catch {
        return null;
      }
    },

    async getText(key) {
      try {
        const result = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
        return (await result.Body?.transformToString()) ?? null;
      } catch {
        return null;
      }
    },

    async remove(key) {
      await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },

    async list(prefix) {
      const objects: StoredObject[] = [];
      let token: string | undefined;
      do {
        const page = await s3.send(
          new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }),
        );
        for (const item of page.Contents ?? []) {
          if (!item.Key) continue;
          objects.push({
            key: item.Key,
            size: item.Size ?? 0,
            lastModified: item.LastModified?.toISOString(),
          });
        }
        token = page.NextContinuationToken;
      } while (token);
      return objects;
    },

    async signedPutUrl(key, contentType) {
      return getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }),
        { expiresIn: SIGNED_URL_TTL },
      );
    },

    async signedGetUrl(key, downloadName) {
      return getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket,
          Key: key,
          ResponseContentDisposition: downloadName
            ? `attachment; filename="${downloadName.replace(/"/g, "")}"`
            : undefined,
        }),
        { expiresIn: SIGNED_URL_TTL },
      );
    },
  };
}
