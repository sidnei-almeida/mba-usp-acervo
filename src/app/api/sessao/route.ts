import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { findUserByUsername, publicUser, verifyPassword } from "@/lib/users";

export const runtime = "nodejs";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe usuário e senha." }, { status: 400 });
  }

  const stored = await findUserByUsername(parsed.data.username);
  const valid = stored && (await verifyPassword(parsed.data.password, stored.passwordHash));
  if (!stored || !valid) {
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  const response = NextResponse.json({ user: publicUser(stored) });
  response.cookies.set(SESSION_COOKIE, createSessionToken(stored.id), sessionCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
