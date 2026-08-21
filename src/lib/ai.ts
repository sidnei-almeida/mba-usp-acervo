import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { KINDS } from "@/lib/types";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Everything here is tuned for the smallest bill that still gets the job done:
 * the cheapest model on the account, the shortest reasoning budget it accepts,
 * a hard ceiling on the completion, and a sample of the PDF rather than the
 * PDF. One upload should cost a fraction of a cent.
 */
export const AI = {
  model: env.groqModel,
  /** gpt-oss bills its reasoning tokens; "low" is the cheapest setting. */
  reasoningEffort: "low",
  /** Reasoning is never shown, so there is no point paying to return it. */
  reasoningFormat: "hidden",
  temperature: 0,
  maxCompletionTokens: 700,
  /** Characters of PDF text handed to the model — roughly 900 tokens. */
  sampleLimit: 3600,
} as const;

export function isAiConfigured() {
  return Boolean(env.groqApiKey);
}

const SYSTEM = [
  "Você cataloga PDFs acadêmicos para a biblioteca do MBA USP/Esalq.",
  "Use apenas o trecho fornecido. Não invente dados bibliográficos: campo sem evidência = null.",
  "title: só o nome principal da obra. Nada de slogan, subtítulo, edição, autor ou nome de arquivo.",
  "subtitle: o complemento do título, se houver. Edição nunca entra aqui.",
  "edition: só o número, ex '14'.",
  "authors: pessoas, ordem de leitura, sem instituição, sem 'et al', sem organizador.",
  "description: 2 frases suas resumindo o assunto a partir do trecho, até 320 caracteres. Este é o único campo que você redige.",
  "tags: 3 a 5 temas em minúsculas.",
  "Responda só o JSON.",
].join(" ");

/** Strict schema: the model cannot return a shape the parser has to guess at. */
const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "subtitle",
    "authors",
    "year",
    "publisher",
    "edition",
    "isbn",
    "language",
    "discipline",
    "kind",
    "tags",
    "description",
  ],
  properties: {
    title: { type: ["string", "null"] },
    subtitle: { type: ["string", "null"] },
    authors: { type: "array", items: { type: "string" }, maxItems: 8 },
    year: { type: ["integer", "null"] },
    publisher: { type: ["string", "null"] },
    edition: { type: ["string", "null"] },
    isbn: { type: ["string", "null"] },
    language: { type: ["string", "null"] },
    discipline: { type: ["string", "null"] },
    kind: { type: ["string", "null"], enum: [...KINDS, null] },
    tags: { type: "array", items: { type: "string" }, maxItems: 6 },
    description: { type: ["string", "null"] },
  },
} as const;

const suggestion = z.object({
  title: z.string().nullish(),
  subtitle: z.string().nullish(),
  authors: z.array(z.string()).nullish(),
  year: z.number().nullish(),
  publisher: z.string().nullish(),
  edition: z.string().nullish(),
  isbn: z.string().nullish(),
  language: z.string().nullish(),
  discipline: z.string().nullish(),
  kind: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  description: z.string().nullish(),
});

export type Suggestion = z.infer<typeof suggestion>;

export type SuggestionResult = {
  suggestion: Suggestion;
  usage: { prompt: number; completion: number };
};

export class AiError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

/** Trims the sample to a whole word so the model never sees a cut token. */
function sample(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= AI.sampleLimit) return clean;
  const cut = clean.slice(0, AI.sampleLimit);
  return cut.slice(0, cut.lastIndexOf(" ") + 1 || cut.length);
}

export async function suggestMetadata({
  text,
  fileName,
  disciplines,
}: {
  text: string;
  fileName: string;
  disciplines: string[];
}): Promise<SuggestionResult> {
  if (!env.groqApiKey) throw new AiError("A ajuda da IA não está configurada.", 503);

  const excerpt = sample(text);
  if (excerpt.length < 120) {
    throw new AiError(
      "Não deu para ler texto neste PDF — provavelmente é um escaneamento de imagem. Preencha à mão.",
      422,
    );
  }

  // The known areas go in as a closed list so the model reuses a shelf that
  // already exists instead of inventing a synonym.
  const user = [
    `Arquivo: ${fileName}`,
    `Áreas já existentes (prefira uma delas): ${disciplines.join(", ") || "nenhuma"}`,
    `Formatos válidos: ${KINDS.join(", ")}`,
    "",
    "Trecho das primeiras páginas:",
    excerpt,
  ].join("\n");

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI.model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      temperature: AI.temperature,
      max_completion_tokens: AI.maxCompletionTokens,
      reasoning_effort: AI.reasoningEffort,
      reasoning_format: AI.reasoningFormat,
      stream: false,
      response_format: {
        type: "json_schema",
        json_schema: { name: "metadados", strict: true, schema: RESPONSE_SCHEMA },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new AiError("A IA está no limite de uso agora. Tente em instantes.", 429);
    }
    throw new AiError(`A IA recusou o pedido (${response.status}). ${detail.slice(0, 160)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const choice = payload.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new AiError("A resposta da IA foi cortada. Tente de novo.", 502);
  }

  const content = choice?.message?.content;
  if (!content) throw new AiError("A IA respondeu vazio.");

  const parsed = suggestion.safeParse(JSON.parse(content));
  if (!parsed.success) throw new AiError("A IA respondeu fora do formato esperado.");

  return {
    suggestion: parsed.data,
    usage: {
      prompt: payload.usage?.prompt_tokens ?? 0,
      completion: payload.usage?.completion_tokens ?? 0,
    },
  };
}
