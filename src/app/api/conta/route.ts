import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { createUser, findUserByUsername, isReservedUsername } from "@/lib/users";

export const runtime = "nodejs";

const schema = z.object({
  username: z
    .string()
    .min(3, "Use ao menos 3 caracteres.")
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado."),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres.").max(200),
  name: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  if (isReservedUsername(parsed.data.username)) {
    return NextResponse.json({ error: "Esse nome de usuário é reservado." }, { status: 409 });
  }

  if (await findUserByUsername(parsed.data.username)) {
    return NextResponse.json({ error: "Esse usuário já existe." }, { status: 409 });
  }

  const user = await createUser(parsed.data);
  const response = NextResponse.json({ user }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions());
  return response;
}
