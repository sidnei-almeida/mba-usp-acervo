import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_HOSTS = new Set([
  "covers.openlibrary.org",
  "books.google.com",
  "books.googleusercontent.com",
  "books.googleapis.com",
]);

/**
 * Remote covers are proxied so the page never depends on a third-party host
 * being reachable from the visitor's network, and so they can be cached.
 */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) return NextResponse.json({ error: "Sem url." }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(parsed, {
      signal: controller.signal,
      headers: { "User-Agent": "Silo/1.0 (acervo MBA Data Science)" },
      next: { revalidate: 604800 },
    });

    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.startsWith("image/")) {
      return NextResponse.json({ error: "Capa indisponível." }, { status: 404 });
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Capa indisponível." }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
