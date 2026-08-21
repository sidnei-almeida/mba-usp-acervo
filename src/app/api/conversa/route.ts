import { NextResponse } from "next/server";
import { z } from "zod";
import { CHAT, ChatError, streamRecommendation } from "@/lib/ai-chat";
import { listBooks } from "@/lib/catalog";
import { rankByDownloads } from "@/lib/curation";
import { isAiConfigured } from "@/lib/ai";
import { runSearch, buildIndex, EMPTY_FILTERS } from "@/lib/search";
import type { Book } from "@/lib/types";

export const runtime = "nodejs";

/**
 * A question and an answer do not share a size. Holding both to the visitor's
 * 600 characters made every follow-up fail validation, because the model's own
 * previous turn comes back in the history far longer than that.
 */
const schema = z.object({
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({
          role: z.literal("user"),
          content: z.string().min(1).max(CHAT.messageLimit),
        }),
        z.object({
          role: z.literal("assistant"),
          content: z.string().min(1).max(CHAT.replyLimit),
        }),
      ]),
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

  // Pruning drops only windows that already expired. Clearing the whole map
  // would hand a free quota to everyone currently being throttled.
  if (hits.size > 5000) {
    for (const [other, stamps] of hits) {
      if (stamps.every((at) => now - at >= WINDOW_MS)) hits.delete(other);
    }
  }
  return false;
}

/** Words that carry no shelf signal; every question is full of them. */
const VAZIAS = new Set([
  "a","as","ao","aos","o","os","de","do","da","dos","das","e","em","um","uma",
  "para","por","com","sem","que","qual","quais","quero","queria","gostaria",
  "preciso","tem","ter","sobre","algo","alguma","algum","me","meu","minha",
  "entender","aprender","estudar","ler","livro","livros","material","zero",
  "como","onde","quando","voce","você","recomenda","recomendar","indica","sugere",
  "bom","boa","melhor","mais","muito","tudo","isso","the","of","for","about",
]);

/**
 * runSearch demands that every term match, which is right for a search box and
 * wrong for a sentence: "quero entender valuation do zero" matched nothing at
 * all. Here each meaningful word searches on its own and the hits are unioned,
 * so one good word is enough to reach the shelf.
 */
function searchQuestion(all: Book[], question: string) {
  const index = buildIndex(all);
  const terms = question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2 && !VAZIAS.has(word));

  if (terms.length === 0) return [];

  const scores = new Map<string, { book: Book; hits: number }>();
  for (const term of terms) {
    for (const book of runSearch(index, { ...EMPTY_FILTERS, q: term })) {
      const current = scores.get(book.id);
      if (current) current.hits += 1;
      else scores.set(book.id, { book, hits: 1 });
    }
  }

  // Books touched by more of the question come first.
  return [...scores.values()]
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 16)
    .map((entry) => entry.book);
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
    const matched = searchQuestion(all, question?.content ?? "");
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
