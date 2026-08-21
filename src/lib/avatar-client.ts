"use client";

/** Portraits are shown at 40px at most; 256 covers retina with room to spare. */
export const AVATAR_SIZE = 256;
export const AVATAR_QUALITY = 0.82;
export const AVATAR_MAX_BYTES = 300 * 1024;

/**
 * Squares, downscales and re-encodes the chosen picture to WebP in the browser.
 * A 4 MB phone photo leaves here around 15 KB, so the upload is instant and the
 * bucket never holds a full-resolution portrait.
 */
export async function toAvatarWebp(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha uma imagem.");
  }

  const bitmap = await createImageBitmap(file);
  // Centre crop to a square before scaling, so nobody gets stretched.
  const edge = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - edge) / 2;
  const sy = (bitmap.height - edge) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível processar a imagem.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sx, sy, edge, edge, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", AVATAR_QUALITY),
  );

  // Safari only learned to encode WebP in 14; without it there is no fallback
  // worth keeping, since the whole point is the smaller format.
  if (!blob || blob.type !== "image/webp") {
    throw new Error("Seu navegador não consegue gerar WebP. Tente pelo Chrome ou Firefox.");
  }
  if (blob.size > AVATAR_MAX_BYTES) {
    throw new Error("A imagem ficou grande demais depois de otimizada.");
  }

  return blob;
}
