import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const TTL = 1000 * 60 * 15;

export function createUploadToken(key: string) {
  const expires = Date.now() + TTL;
  const signature = createHmac("sha256", env.sessionSecret)
    .update(`${key}:${expires}`)
    .digest("hex");
  return `${expires}.${signature}`;
}

export function verifyUploadToken(key: string, token: string | null) {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (Number(expires) < Date.now()) return false;
  const expected = createHmac("sha256", env.sessionSecret)
    .update(`${key}:${expires}`)
    .digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
