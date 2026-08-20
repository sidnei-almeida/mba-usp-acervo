import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 200 * 1024 * 1024;

/**
 * Token exchange for browser uploads: the file goes straight from the reader's
 * machine to the store, so nothing has to squeeze through the 4.5 MB body
 * limit of a function.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await currentUser();
        if (!user) throw new Error("Entre na sua conta para enviar.");
        if (!pathname.startsWith("livros/") && !pathname.startsWith("capas/")) {
          throw new Error("Caminho não permitido.");
        }

        return {
          allowedContentTypes: ["application/pdf", "image/jpeg"],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: MAX_PDF_BYTES,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      // The record is written by /api/livros with the key the browser reports,
      // so nothing here depends on the completion webhook — which cannot reach
      // localhost anyway.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no upload." },
      { status: 400 },
    );
  }
}
