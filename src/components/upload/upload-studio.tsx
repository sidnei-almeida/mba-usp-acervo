"use client";

import { useRouter } from "next/navigation";
import { upload as blobUpload } from "@vercel/blob/client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FileText, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import { UploadGuide } from "@/components/upload/upload-guide";
import type { CoverCandidate } from "@/lib/covers";
import { readPdfPreview } from "@/lib/pdf-client";
import { KINDS, KIND_LABEL, type CoverSource, type Kind } from "@/lib/types";
import { cx, formatBytes } from "@/lib/utils";

type Form = {
  title: string;
  subtitle: string;
  authors: string;
  year: string;
  publisher: string;
  edition: string;
  isbn: string;
  language: string;
  discipline: string;
  kind: Kind;
  tags: string;
  description: string;
};

const EMPTY: Form = {
  title: "",
  subtitle: "",
  authors: "",
  year: "",
  publisher: "",
  edition: "",
  isbn: "",
  language: "Português",
  discipline: "",
  kind: "livro",
  tags: "",
  description: "",
};

const AI_PREF = "silo:ajuda-ia";
const prefListeners = new Set<() => void>();

function subscribeAiPref(notify: () => void) {
  prefListeners.add(notify);
  return () => {
    prefListeners.delete(notify);
  };
}

function readAiPref() {
  return window.localStorage.getItem(AI_PREF) === "1";
}

function writeAiPref(value: boolean) {
  window.localStorage.setItem(AI_PREF, value ? "1" : "0");
  for (const notify of prefListeners) notify();
}

function titleFromFileName(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type UploadSlot = {
  draftId: string;
  key: string;
  contentType: string;
  mode: "blob" | "put";
  uploadUrl?: string;
  handleUploadUrl?: string;
};

function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (ratio: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", contentType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Falha no upload (${request.status})`));
    request.onerror = () => reject(new Error("Falha de rede durante o upload."));
    request.send(body);
  });
}

/** Asks the server where this file should go, then sends it that way. */
async function sendFile(
  payload: Record<string, unknown>,
  body: Blob,
  contentType: string,
  onProgress?: (ratio: number) => void,
) {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(((await response.json()) as { error?: string }).error ?? "Upload negado.");
  }

  const slot = (await response.json()) as UploadSlot;

  if (slot.mode === "blob") {
    await blobUpload(slot.key, body, {
      access: "public",
      contentType,
      handleUploadUrl: slot.handleUploadUrl ?? "/api/upload/blob",
      // Big files are cut into parts so a dropped connection costs one part.
      multipart: body.size > 20 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onProgress?.(percentage / 100),
    });
  } else {
    await putWithProgress(slot.uploadUrl!, body, contentType, onProgress);
  }

  return slot;
}

export function UploadStudio({ disciplines }: { disciplines: string[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [pdfText, setPdfText] = useState("");
  // Kept outside React so it survives navigation without a hydration mismatch.
  const aiOn = useSyncExternalStore(subscribeAiPref, readAiPref, () => false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  // Fields the assistant wrote, so the form can mark them as suggestions.
  const [aiFields, setAiFields] = useState<Set<keyof Form>>(new Set());

  const [candidates, setCandidates] = useState<CoverCandidate[]>([]);
  const [searchingCover, setSearchingCover] = useState(false);
  // null = first page of the PDF (or the generated cover when there is none).
  const [chosenCover, setChosenCover] = useState<CoverCandidate | null>(null);

  const set = (key: keyof Form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    // Once a human edits a field it stops being a suggestion.
    setAiFields((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  };

  const toggleAi = (value: boolean) => {
    writeAiPref(value);
    if (!value) setAiNote(null);
  };

  /**
   * Sends the front matter, never the file. Only empty fields are filled, so
   * asking for help can never overwrite something already typed.
   */
  const askAi = useCallback(
    async (text: string, fileName: string) => {
      if (!text || text.length < 120) {
        setAiNote("Este PDF não tem camada de texto (escaneado). Preencha à mão.");
        return;
      }

      setAiBusy(true);
      setAiNote(null);
      try {
        const response = await fetch("/api/livros/sugerir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, fileName }),
        });
        const data = (await response.json()) as {
          fields?: Partial<Record<keyof Form, string>>;
          error?: string;
        };
        if (!response.ok || !data.fields) {
          setAiNote(data.error ?? "A IA não conseguiu ler este arquivo.");
          return;
        }

        const written = new Set<keyof Form>();
        setForm((current) => {
          const next = { ...current };
          for (const [key, value] of Object.entries(data.fields!) as [keyof Form, string][]) {
            if (!value) continue;
            const existing = current[key].trim();
            // The title arrives pre-filled from the file name; that is a guess,
            // not an answer, so the assistant may replace it.
            const guessed = key === "title" && existing === titleFromFileName(fileName);
            if (existing && !guessed) continue;
            if (key === "kind") next.kind = value as Kind;
            else next[key] = value;
            written.add(key);
          }
          return next;
        });
        setAiFields(written);
        setAiNote(
          written.size > 0
            ? `${written.size} ${written.size === 1 ? "campo preenchido" : "campos preenchidos"} — confira antes de publicar.`
            : "Nada a acrescentar: os campos já estavam preenchidos.",
        );
      } catch {
        setAiNote("Não foi possível falar com a IA agora.");
      } finally {
        setAiBusy(false);
      }
    },
    [],
  );

  // Cover lookup follows what is typed, debounced, in both catalogues.
  useEffect(() => {
    const title = form.title.trim();
    const isbn = form.isbn.trim();
    const language = form.language;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      if (title.length < 4 && isbn.length < 10) {
        setCandidates([]);
        return;
      }
      setSearchingCover(true);
      try {
        const params = new URLSearchParams({ titulo: title });
        if (form.authors.trim()) params.set("autor", form.authors.split(/[,;]/)[0].trim());
        if (isbn) params.set("isbn", isbn);
        params.set("idioma", language.toLowerCase().startsWith("ing") ? "eng" : "por");

        const response = await fetch(`/api/capas?${params}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as { candidates: CoverCandidate[] };
        setCandidates(data.candidates);
      } catch {
        // aborted or offline — the local cover still works
      } finally {
        setSearchingCover(false);
      }
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [form.title, form.authors, form.isbn, form.language]);

  const accept = useCallback(async (candidate: File) => {
    if (candidate.type !== "application/pdf") {
      setError("Por enquanto o acervo aceita apenas PDF.");
      return;
    }
    setError(null);
    setFile(candidate);
    setForm((current) => ({
      ...current,
      title: current.title || titleFromFileName(candidate.name),
    }));
    setReading(true);
    try {
      const preview = await readPdfPreview(candidate);
      setPages(preview.pages);
      setCoverBlob(preview.coverBlob);
      setCoverUrl(preview.coverUrl);
      setPdfText(preview.text);
      if (aiOn) void askAi(preview.text, candidate.name);
    } catch {
      setPages(null);
    } finally {
      setReading(false);
    }
  }, [aiOn, askAi]);

  const reset = () => {
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    setFile(null);
    setPages(null);
    setCoverBlob(null);
    setCoverUrl(null);
    setProgress(null);
    setPdfText("");
    setAiNote(null);
    setAiFields(new Set());
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setSending(true);
    setError(null);
    setProgress(0);

    try {
      const slot = await sendFile(
        {
          target: "pdf",
          fileName: file.name,
          contentType: "application/pdf",
          size: file.size,
        },
        file,
        "application/pdf",
        (ratio) => setProgress(ratio * 0.9),
      );

      // A remote cover means nothing extra needs storing.
      let coverKey: string | undefined;
      let coverSource: CoverSource = chosenCover ? chosenCover.provider : "gerada";

      if (!chosenCover && coverBlob) {
        try {
          const cover = await sendFile(
            {
              target: "capa",
              draftId: slot.draftId,
              contentType: "image/jpeg",
              size: coverBlob.size,
            },
            coverBlob,
            "image/jpeg",
          );
          coverKey = cover.key;
          coverSource = "pdf";
        } catch {
          // A cover is optional; the typographic one takes over.
        }
      }
      setProgress(0.96);

      const created = await fetch("/api/livros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || undefined,
          authors: form.authors
            .split(/[,;]/)
            .map((author) => author.trim())
            .filter(Boolean),
          year: form.year ? Number(form.year) : undefined,
          publisher: form.publisher.trim() || undefined,
          edition: form.edition.trim() || undefined,
          isbn: form.isbn.trim() || undefined,
          language: form.language.trim() || "Português",
          discipline: form.discipline.trim(),
          kind: form.kind,
          tags: form.tags
            .split(/[,;]/)
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean),
          description: form.description.trim() || undefined,
          pages: pages ?? undefined,
          fileKey: slot.key,
          fileName: file.name,
          fileSize: file.size,
          coverUrl: chosenCover?.coverUrl,
          coverSource,
          coverKey,
        }),
      });

      if (!created.ok) {
        const data = (await created.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Não foi possível salvar o registro.");
      }

      const { book } = (await created.json()) as { book: { slug: string } };
      setProgress(1);
      router.push(`/livro/${book.slug}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado.");
      setProgress(null);
      setSending(false);
    }
  };

  const ready = Boolean(
    file && form.title.trim() && form.authors.trim() && form.discipline.trim(),
  );

  // Rough tell for a badly exported scan: weight per page.
  const perPage = file && pages ? file.size / pages : 0;
  const heavy = perPage > 1.2 * 1024 * 1024;

  /** Field caption, flagged when the value on screen came from the assistant. */
  const fieldLabel = (field: keyof Form, text: string) => (
    <span className="label inline-flex items-center gap-1.5">
      {text}
      {aiFields.has(field) ? (
        <Sparkles
          className="h-2.5 w-2.5 text-azul-luz"
          strokeWidth={2}
          aria-label="Preenchido pela IA"
        />
      ) : null}
    </span>
  );

  const preview = chosenCover
    ? `/api/capa?url=${encodeURIComponent(chosenCover.coverUrl)}`
    : coverUrl;

  return (
    <form
      onSubmit={submit}
      className="shell grid gap-8 pb-20 pt-6 lg:grid-cols-[16rem_1fr] lg:gap-12"
    >
      <div className="lg:sticky lg:top-20 lg:self-start">
        {!file ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) void accept(dropped);
            }}
            onClick={() => inputRef.current?.click()}
            className={cx(
              "flex aspect-[2/3] cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-5 text-center transition-colors",
              dragging
                ? "border-azul-luz bg-azul-luz/10"
                : "border-line bg-ink-2/60 hover:border-white/35",
            )}
          >
            <UploadCloud className="h-6 w-6 text-dim" strokeWidth={1.2} />
            <div>
              <p className="display text-lg">Solte o PDF aqui</p>
              <p className="mt-2 text-[0.625rem] uppercase tracking-[0.14em] text-dim">
                Clique para escolher · até 200 MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                if (chosen) void accept(chosen);
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative aspect-[2/3] overflow-hidden border border-line bg-ink-2">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Prévia da capa" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center">
                  {reading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-dim" strokeWidth={1.4} />
                  ) : (
                    <FileText className="h-6 w-6 text-dim" strokeWidth={1.2} />
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={reset}
                aria-label="Remover arquivo"
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center bg-black/70 backdrop-blur transition-colors hover:bg-black/90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-[0.6875rem] text-dim">
              <p className="truncate text-bone">{file.name}</p>
              <p className="mt-1">
                {formatBytes(file.size)}
                {pages ? ` · ${pages} páginas` : reading ? " · lendo…" : ""}
              </p>
            </div>

            {heavy ? (
              <p className="border border-[#6b5a1f] bg-[#1e1a0e] px-3 py-2 text-[0.6875rem] leading-relaxed text-[#d8b451]">
                Esse PDF está pesado para o número de páginas
                {` (${formatBytes(perPage)} por página)`}. Antes de enviar, vale
                rodar <code className="text-bone">npm run preparar {file.name}</code>{" "}
                e subir a versão otimizada — costuma cair 70% sem perder texto.
              </p>
            ) : null}

            {progress !== null ? (
              <div className="h-[2px] w-full overflow-hidden bg-white/10">
                <div
                  className="h-full bg-bone transition-[width] duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            ) : null}

            <div className="border-t border-line pt-3">
              <div className="flex items-center justify-between">
                <span className="label">Capa</span>
                {searchingCover ? (
                  <Loader2 className="h-3 w-3 animate-spin text-dim" strokeWidth={1.5} />
                ) : null}
              </div>

              <div className="rail mt-2 gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={() => setChosenCover(null)}
                  className={cx(
                    "h-[3.75rem] w-10 shrink-0 overflow-hidden border transition-colors",
                    chosenCover === null ? "border-bone" : "border-line hover:border-white/40",
                  )}
                  title={coverUrl ? "Primeira página do PDF" : "Capa tipográfica"}
                >
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full place-items-center text-[0.5rem] uppercase tracking-[0.1em] text-dim">
                      Auto
                    </span>
                  )}
                </button>

                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setChosenCover(candidate)}
                    title={`${candidate.title}${candidate.year ? ` · ${candidate.year}` : ""}`}
                    className={cx(
                      "h-[3.75rem] w-10 shrink-0 overflow-hidden border transition-colors",
                      chosenCover?.id === candidate.id
                        ? "border-bone"
                        : "border-line hover:border-white/40",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/capa?url=${encodeURIComponent(candidate.thumbUrl)}`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <p className="mt-1.5 text-[0.5625rem] uppercase tracking-[0.14em] text-dim">
                {chosenCover
                  ? `Capa via ${chosenCover.provider === "googlebooks" ? "Google Books" : "Open Library"} · nada é salvo no R2`
                  : coverUrl
                    ? "Primeira página do PDF"
                    : "Capa tipográfica gerada"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl space-y-6">
        <UploadGuide />

        <div className="border border-line">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Sparkles className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.4} />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.8125rem] text-bone">Ajuda da IA</span>
              <span className="block text-[0.6875rem] leading-snug text-dim">
                Lê as primeiras páginas do PDF e preenche os campos vazios no
                padrão do acervo. Você confere e corrige antes de publicar.
              </span>
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={aiOn}
              aria-label="Ajuda da IA"
              onClick={() => toggleAi(!aiOn)}
              className={cx(
                "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
                aiOn ? "border-azul-luz bg-azul-luz/30" : "border-line bg-white/5",
              )}
            >
              <span
                className={cx(
                  "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-all duration-200",
                  aiOn ? "left-[1.25rem] bg-azul-luz" : "left-[0.15rem] bg-dim",
                )}
              />
            </button>
          </div>

          {aiOn && file ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2.5">
              <button
                type="button"
                onClick={() => void askAi(pdfText, file.name)}
                disabled={aiBusy || reading}
                className="btn btn-ghost h-7 px-3 text-[0.625rem] disabled:pointer-events-none disabled:opacity-40"
              >
                {aiBusy ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.6} />
                    Lendo o PDF…
                  </>
                ) : (
                  "Preencher com a IA"
                )}
              </button>
              {aiNote ? (
                <p className="min-w-0 flex-1 text-[0.6875rem] leading-snug text-dim">{aiNote}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            {fieldLabel("title", "Título *")}
            <input
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              className="field mt-1.5"
              placeholder="Estatística Aplicada à Tomada de Decisão"
              required
            />
          </label>

          <label className="sm:col-span-2">
            {fieldLabel("subtitle", "Subtítulo")}
            <input
              value={form.subtitle}
              onChange={(event) => set("subtitle", event.target.value)}
              className="field mt-1.5"
              placeholder="Da inferência clássica aos modelos preditivos"
            />
          </label>

          <label className="sm:col-span-2">
            {fieldLabel("authors", "Autores * (separe por vírgula)")}
            <input
              value={form.authors}
              onChange={(event) => set("authors", event.target.value)}
              className="field mt-1.5"
              placeholder="Fábio Miranda, Helena Duarte"
              required
            />
          </label>

          <label>
            {fieldLabel("discipline", "Área do curso *")}
            <input
              value={form.discipline}
              onChange={(event) => set("discipline", event.target.value)}
              list="disciplinas"
              className="field mt-1.5"
              placeholder="Finanças"
              required
            />
            <datalist id="disciplinas">
              {disciplines.map((discipline) => (
                <option key={discipline} value={discipline} />
              ))}
            </datalist>
          </label>

          <label>
            {fieldLabel("kind", "Formato")}
            <select
              value={form.kind}
              onChange={(event) => set("kind", event.target.value)}
              className="field mt-1.5"
            >
              {KINDS.map((kind) => (
                <option key={kind} value={kind} className="bg-ink">
                  {KIND_LABEL[kind]}
                </option>
              ))}
            </select>
          </label>

          <label>
            {fieldLabel("publisher", "Editora")}
            <input
              value={form.publisher}
              onChange={(event) => set("publisher", event.target.value)}
              className="field mt-1.5"
              placeholder="Editora Piracicaba"
            />
          </label>

          <label>
            {fieldLabel("year", "Ano")}
            <input
              value={form.year}
              onChange={(event) => set("year", event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              className="field mt-1.5"
              placeholder="2024"
            />
          </label>

          <label>
            {fieldLabel("isbn", "ISBN (ajuda a achar a capa)")}
            <input
              value={form.isbn}
              onChange={(event) => set("isbn", event.target.value)}
              className="field mt-1.5"
              placeholder="9788522123456"
            />
          </label>

          <label>
            {fieldLabel("edition", "Edição")}
            <input
              value={form.edition}
              onChange={(event) => set("edition", event.target.value)}
              className="field mt-1.5"
              placeholder="3ª edição"
            />
          </label>

          <label>
            {fieldLabel("language", "Idioma")}
            <input
              value={form.language}
              onChange={(event) => set("language", event.target.value)}
              className="field mt-1.5"
            />
          </label>

          <label className="sm:col-span-2">
            {fieldLabel("tags", "Palavras-chave")}
            <input
              value={form.tags}
              onChange={(event) => set("tags", event.target.value)}
              className="field mt-1.5"
              placeholder="valuation, fluxo de caixa, investimentos"
            />
          </label>

          <label className="sm:col-span-2">
            {fieldLabel("description", "Descrição")}
            <textarea
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              rows={5}
              className="field mt-1.5"
              placeholder="Em duas ou três frases: o que o material cobre e para quem serve."
            />
          </label>
        </div>

        {error ? (
          <p className="border border-[#6f3226] bg-[#22110e] px-3 py-2 text-[0.75rem] text-[#e5a08c]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <button
            type="submit"
            disabled={!ready || sending}
            className="btn btn-solid disabled:pointer-events-none disabled:opacity-35"
          >
            {sending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
                Enviando…
              </>
            ) : (
              "Publicar no acervo"
            )}
          </button>
          <p className="text-[0.6875rem] text-dim">
            Ao publicar, você confirma ter direito de compartilhar este material.
            O PDF é compactado logo depois do envio, sem perder o texto.
          </p>
        </div>
      </div>
    </form>
  );
}
