import { NextResponse } from "next/server";
import { z } from "zod";
import { AI, AiError, isAiConfigured, suggestMetadata } from "@/lib/ai";
import { currentUser } from "@/lib/auth";
import { disciplinesOf, listBooks } from "@/lib/catalog";
import {
  normalizeAuthors,
  normalizeDescription,
  normalizeDiscipline,
  normalizeEdition,
  normalizeIsbn,
  normalizeKind,
  normalizeLanguage,
  normalizePublisher,
  normalizeTags,
  normalizeTitle,
  normalizeYear,
} from "@/lib/normalize";

export const runtime = "nodejs";

const schema = z.object({
  // Already trimmed in the browser; the cap here is the spend guard.
  text: z.string().min(1).max(20000),
  fileName: z.string().min(1).max(200),
});

/** Soft per-account throttle: the model is cheap, but not free. */
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 12;
const hits = new Map<string, number[]>();

function throttled(userId: string) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= LIMIT) return true;
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Entre na sua conta para usar a ajuda da IA." }, { status: 401 });
  }
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "A ajuda da IA não está configurada." }, { status: 503 });
  }
  if (throttled(user.id)) {
    return NextResponse.json(
      { error: "Muitas sugestões seguidas. Aguarde alguns minutos." },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const known = disciplinesOf(await listBooks()).map((entry) => entry.name);

  try {
    const { suggestion, usage } = await suggestMetadata({
      text: parsed.data.text,
      fileName: parsed.data.fileName,
      disciplines: known,
    });

    // The model proposes; the house style decides how it is written.
    const fields = {
      title: suggestion.title ? normalizeTitle(suggestion.title) : "",
      subtitle: suggestion.subtitle ? normalizeTitle(suggestion.subtitle) : "",
      authors: suggestion.authors?.length ? normalizeAuthors(suggestion.authors).join(", ") : "",
      year: normalizeYear(suggestion.year ?? undefined)?.toString() ?? "",
      publisher: suggestion.publisher ? normalizePublisher(suggestion.publisher) : "",
      edition: suggestion.edition ? normalizeEdition(suggestion.edition) : "",
      isbn: suggestion.isbn ? normalizeIsbn(suggestion.isbn) : "",
      language: suggestion.language ? normalizeLanguage(suggestion.language) : "",
      discipline: suggestion.discipline ? normalizeDiscipline(suggestion.discipline, known) : "",
      kind: suggestion.kind ? normalizeKind(suggestion.kind) ?? "" : "",
      tags: suggestion.tags?.length ? normalizeTags(suggestion.tags).join(", ") : "",
      description: suggestion.description ? normalizeDescription(suggestion.description) : "",
    };

    return NextResponse.json({ fields, usage, model: AI.model });
  } catch (cause) {
    if (cause instanceof AiError) {
      return NextResponse.json({ error: cause.message }, { status: cause.status });
    }
    return NextResponse.json({ error: "A ajuda da IA falhou. Preencha à mão." }, { status: 502 });
  }
}
