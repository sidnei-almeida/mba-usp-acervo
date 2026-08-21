import { NextResponse } from "next/server";
import { z } from "zod";
import { CHAT, ChatError, streamRecommendation } from "@/lib/ai-chat";
import { listBooks } from "@/lib/catalog";
import { rankByDownloads } from "@/lib/curation";
import { isAiConfigured } from "@/lib/ai";
import { runSearch, buildIndex, EMPTY_FILTERS } from "@/lib/search";

export const runtime = "nodejs";

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(CHAT.messageLimit),
      }),
    )
    .min(1)
    .max(20),
});

/** Open to visitors, so the throttle is the only thing guarding the bill. */
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 15;
const hits = new Map<string, number[]>();

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
}

function throttled(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= LIMIT) return true;
  recent.push(now);
  hits.set(key, recent);
  // The map is per-instance and small; pruning keeps it from drifting upward.
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "O bibliotecário está fora do ar." }, { status: 503 });
  }
  if (throttled(clientKey(request))) {
    return NextResponse.json(
      { error: "Muitas perguntas seguidas. Volte daqui a pouco." },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const all = await listBooks();

  // Small shelf: the model sees everything. Large shelf: it sees what the
  // question actually reaches, plus the most borrowed titles as a floor.
  let books = all;
  if (all.length > CHAT.inlineCeiling) {
    const question = [...parsed.data.messages].reverse().find((m) => m.role === "user");
    const matched = runSearch(buildIndex(all), {
      ...EMPTY_FILTERS,
      q: question?.content ?? "",
    }).slice(0, 16);

    const popular = rankByDownloads(all)
      .slice(0, 6)
      .map((entry) => entry.book);
    books = [...new Map([...matched, ...popular].map((book) => [book.id, book])).values()];
  }

  try {
    const stream = await streamRecommendation({ messages: parsed.data.messages, books });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (cause) {
    if (cause instanceof ChatError) {
      return NextResponse.json({ error: cause.message }, { status: cause.status });
    }
    return NextResponse.json({ error: "O bibliotecário falhou." }, { status: 502 });
  }
}
