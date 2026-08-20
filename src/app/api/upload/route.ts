import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { currentUser } from "@/lib/auth";
import { COVER_PREFIX, FILE_PREFIX } from "@/lib/catalog";
import { storage } from "@/lib/storage";
import { createUploadToken } from "@/lib/upload-token";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 200 * 1024 * 1024;

type Payload = {
  target?: "pdf" | "capa";
  fileName?: string;
  contentType?: string;
  size?: number;
  draftId?: string;
};

export async function POST(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Entre na sua conta para enviar." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Payload;
  const target = body.target ?? "pdf";
  const draftId = body.draftId?.replace(/[^a-zA-Z0-9_-]/g, "") || nanoid(10);

  if (target === "pdf") {
    if (body.contentType !== "application/pdf") {
      return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
    }
    if ((body.size ?? 0) > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "Arquivo acima de 200 MB." }, { status: 413 });
    }
  }

  const contentType = target === "pdf" ? "application/pdf" : "image/jpeg";
  const safeName = slugify(body.fileName?.replace(/\.pdf$/i, "") ?? "documento") || "documento";
  const key =
    target === "pdf"
      ? `${FILE_PREFIX}${draftId}/${safeName}.pdf`
      : `${COVER_PREFIX}${draftId}.jpg`;

  const driver = storage().name;

  // Three ways in, decided by the driver: a presigned PUT (R2), the client
  // upload handshake (Vercel Blob) or a proxied PUT (local filesystem).
  if (driver === "blob") {
    return NextResponse.json({
      draftId,
      key,
      contentType,
      driver,
      mode: "blob" as const,
      handleUploadUrl: "/api/upload/blob",
    });
  }

  const signed = await storage().signedPutUrl(key, contentType);

  return NextResponse.json({
    draftId,
    key,
    contentType,
    driver,
    mode: "put" as const,
    uploadUrl:
      signed ??
      `/api/upload/proxy?key=${encodeURIComponent(key)}&token=${createUploadToken(key)}`,
  });
}
