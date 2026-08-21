import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { avatarKeyFor, setAvatarKey } from "@/lib/users";

export const runtime = "nodejs";

const MAX_BYTES = 300 * 1024;
/** RIFF....WEBP — the only shape this endpoint accepts. */
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function isWebp(bytes: Uint8Array) {
  if (bytes.length < 12) return false;
  return (
    RIFF.every((byte, index) => bytes[index] === byte) &&
    WEBP.every((byte, index) => bytes[8 + index] === byte)
  );
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  }

  const buffer = new Uint8Array(await request.arrayBuffer());
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
  }
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem grande demais." }, { status: 413 });
  }
  // The browser already encoded it; this makes sure that is what actually came.
  if (!isWebp(buffer)) {
    return NextResponse.json({ error: "Formato inválido." }, { status: 415 });
  }

  const key = avatarKeyFor(user.id);
  await storage().put(key, buffer, "image/webp");
  const updated = await setAvatarKey(user.id, key);

  return NextResponse.json({ user: updated, key });
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  }

  if (user.avatarKey) {
    // A failed removal must not block clearing the record.
    await storage().remove(user.avatarKey).catch(() => undefined);
  }
  const updated = await setAvatarKey(user.id, null);

  return NextResponse.json({ user: updated });
}
