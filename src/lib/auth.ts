import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { findUserById, type User } from "@/lib/users";

const COOKIE = "acervo_sessao";
const MAX_AGE = 60 * 60 * 24 * 30;

function sign(value: string) {
  return createHmac("sha256", env.sessionSecret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

export function createSessionToken(userId: string) {
  const issued = String(Date.now());
  return `${userId}.${issued}.${sign(`${userId}.${issued}`)}`;
}

function readToken(token: string | undefined) {
  if (!token) return null;
  const [userId, issued, signature] = token.split(".");
  if (!userId || !issued || !signature) return null;
  if (Date.now() - Number(issued) > MAX_AGE * 1000) return null;
  if (!safeEqual(signature, sign(`${userId}.${issued}`))) return null;
  return userId;
}

export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  const userId = readToken(store.get(COOKIE)?.value);
  if (!userId) return null;
  return findUserById(userId);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}

/** Owner or administrator may edit and remove a record. */
export function canManage(user: User | null, ownerId?: string) {
  if (!user) return false;
  return user.role === "admin" || (Boolean(ownerId) && user.id === ownerId);
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = MAX_AGE;
