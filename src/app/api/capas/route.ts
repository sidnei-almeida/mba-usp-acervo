import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { searchCovers } from "@/lib/covers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const candidates = await searchCovers({
    title: params.get("titulo") ?? undefined,
    author: params.get("autor") ?? undefined,
    isbn: params.get("isbn") ?? undefined,
    language: params.get("idioma") ?? undefined,
  });

  return NextResponse.json({ candidates: candidates.slice(0, 10) });
}
