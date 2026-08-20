import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

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

/** No passcode configured means the instance is open — useful while testing. */
export function passcodeRequired() {
  return Boolean(env.uploadPasscode);
}

export function checkPasscode(input: string) {
  if (!env.uploadPasscode) return true;
  return safeEqual(input, env.uploadPasscode);
}

export function sessionToken() {
  const issued = String(Date.now());
  return `${issued}.${sign(issued)}`;
}

function validToken(token: string | undefined) {
  if (!token) return false;
  const [issued, signature] = token.split(".");
  if (!issued || !signature) return false;
  if (Date.now() - Number(issued) > MAX_AGE * 1000) return false;
  return safeEqual(signature, sign(issued));
}

export async function isContributor() {
  if (!passcodeRequired()) return true;
  const store = await cookies();
  return validToken(store.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = MAX_AGE;
