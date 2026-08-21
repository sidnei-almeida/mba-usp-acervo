import "server-only";
import { env } from "@/lib/env";
import type { Book } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export const CHAT = {
  /** Bigger sibling of the cataloguing model: this one has to converse. */
  model: env.groqChatModel,
  reasoningEffort: "low",
  reasoningFormat: "hidden",
  temperature: 0.4,
  maxCompletionTokens: 600,
  /** Turns of history kept; older context is not worth the tokens. */
  historyTurns: 6,
  /** What a visitor may type. Matches the input's maxLength. */
  messageLimit: 600,
  /**
   * What an answer may be worth on the way back in. The model is allowed 600
   * completion tokens, so its own turns are far longer than a question — capping
   * both at the same number rejected every second question.
   */
  replyLimit: 4000,
  /** How much of a past answer is resent as context. */
  historyReplyLimit: 1200,
  /**
   * Above this many titles the whole catalogue stops being cheap to inline and
   * the context should switch to a search pass instead.
   */
  inlineCeiling: 80,
} as const;

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * One line per title, in the order the model should prefer. Deliberately terse:
 * this block is resent on every turn, so each wasted word is paid for again.
 */
export function catalogContext(books: Book[]) {
  return books
    .map((book) => {
      const authors = book.authors.slice(0, 2).join(", ");
      const tags = book.tags.slice(0, 4).join("/");
      return [
        book.slug,
        book.subtitle ? `${book.title}: ${book.subtitle}` : book.title,
        authors,
        book.discipline,
        KIND_LABEL[book.kind],
        book.year ?? "s.d.",
        tags,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");
}

const SYSTEM = [
  "Você é o bibliotecário do Silo, o acervo digital dos alunos do MBA USP/Esalq.",
  "Recomende SOMENTE títulos da lista recebida. Nunca invente obra, autor ou link.",
  "Escreva o slug entre colchetes duplos logo após citar o título, assim: Valuation [[valuation]].",
  "Recomende de 1 a 3 títulos, cada um com uma frase curta dizendo por que serve.",
  "Se nada na lista atender, diga isso com franqueza e sugira a área mais próxima.",
  "Português do Brasil, tom de colega de turma, direto. Sem listas longas, sem enrolação.",
  "Texto puro: nada de markdown, asterisco, hífen de lista ou cabeçalho.",
  "Fora do assunto do acervo, responda em uma frase e volte a oferecer ajuda com leituras.",
].join(" ");

export class ChatError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

/** Opens the upstream stream; the route pipes the text straight to the browser. */
export async function streamRecommendation({
  messages,
  books,
}: {
  messages: ChatMessage[];
  books: Book[];
}): Promise<ReadableStream<Uint8Array>> {
  if (!env.groqApiKey) throw new ChatError("O bibliotecário está fora do ar.", 503);
  if (books.length === 0) throw new ChatError("O acervo ainda está vazio.", 503);

  const history = messages.slice(-CHAT.historyTurns).map((message) => ({
    role: message.role,
    content: message.content.slice(
      0,
      message.role === "assistant" ? CHAT.historyReplyLimit : CHAT.messageLimit,
    ),
  }));

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT.model,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "system",
          content: `Acervo (slug | título | autores | área | formato | ano | temas):\n${catalogContext(books)}`,
        },
        ...history,
      ],
      temperature: CHAT.temperature,
      max_completion_tokens: CHAT.maxCompletionTokens,
      reasoning_effort: CHAT.reasoningEffort,
      reasoning_format: CHAT.reasoningFormat,
      stream: true,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok || !response.body) {
    if (response.status === 429) {
      throw new ChatError("O bibliotecário está ocupado. Tente em instantes.", 429);
    }
    throw new ChatError(`O bibliotecário tropeçou (${response.status}).`);
  }

  return toTextStream(response.body);
}

/** Server-sent events in, plain text out — the client has nothing to parse. */
function toTextStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  /** Reads whatever complete "data:" frames the buffer holds. */
  function drain(text: string, controller: TransformStreamDefaultController<Uint8Array>) {
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) controller.enqueue(encoder.encode(content));
      } catch {
        // A malformed frame is skipped rather than killing the answer.
      }
    }
  }

  return source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        // The last piece may be a half-received line; it waits for more bytes.
        buffer = lines.pop() ?? "";
        drain(lines.join("\n"), controller);
      },

      // A final frame without its trailing newline would otherwise be dropped.
      flush(controller) {
        buffer += decoder.decode();
        if (buffer) drain(buffer, controller);
      },
    }),
  );
}
