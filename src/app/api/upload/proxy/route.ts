import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { verifyUploadToken } from "@/lib/upload-token";

export const runtime = "nodejs";

/** Fallback upload path used when the driver cannot issue presigned URLs. */
export async function PUT(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Entre na sua conta para enviar." }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const token = url.searchParams.get("token");

  if (!key || !verifyUploadToken(key, token)) {
    return NextResponse.json({ error: "Token de upload inválido." }, { status: 403 });
  }

  const buffer = new Uint8Array(await request.arrayBuffer());
  await storage().put(
    key,
    buffer,
    request.headers.get("content-type") ?? "application/octet-stream",
  );

  return NextResponse.json({ ok: true, key, size: buffer.byteLength });
}
