"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { readPdfPreview } from "@/lib/pdf-client";
import { KINDS, KIND_LABEL, type Kind } from "@/lib/types";
import { cx, formatBytes } from "@/lib/utils";

type Form = {
  title: string;
  subtitle: string;
  authors: string;
  year: string;
  publisher: string;
  edition: string;
  language: string;
  discipline: string;
  kind: Kind;
  tags: string;
  description: string;
  uploadedBy: string;
};

const EMPTY: Form = {
  title: "",
  subtitle: "",
  authors: "",
  year: "",
  publisher: "",
  edition: "",
  language: "Português",
  discipline: "",
  kind: "livro",
  tags: "",
  description: "",
  uploadedBy: "",
};

function titleFromFileName(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function put(
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

  const set = (key: keyof Form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

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
    } catch {
      setPages(null);
    } finally {
      setReading(false);
    }
  }, []);

  const reset = () => {
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    setFile(null);
    setPages(null);
    setCoverBlob(null);
    setCoverUrl(null);
    setProgress(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setSending(true);
    setError(null);
    setProgress(0);

    try {
      const pdfSlot = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "pdf",
          fileName: file.name,
          contentType: "application/pdf",
          size: file.size,
        }),
      });
      if (!pdfSlot.ok) throw new Error((await pdfSlot.json()).error ?? "Upload negado.");
      const slot = (await pdfSlot.json()) as { draftId: string; key: string; uploadUrl: string };

      await put(slot.uploadUrl, file, "application/pdf", (ratio) =>
        setProgress(ratio * 0.9),
      );

      let coverKey: string | undefined;
      if (coverBlob) {
        const coverSlot = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: "capa",
            draftId: slot.draftId,
            contentType: "image/jpeg",
            size: coverBlob.size,
          }),
        });
        if (coverSlot.ok) {
          const cover = (await coverSlot.json()) as { key: string; uploadUrl: string };
          await put(cover.uploadUrl, coverBlob, "image/jpeg");
          coverKey = cover.key;
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
          coverKey,
          uploadedBy: form.uploadedBy.trim() || undefined,
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

  const ready = Boolean(file && form.title.trim() && form.authors.trim() && form.discipline.trim());

  return (
    <form onSubmit={submit} className="shell grid gap-14 pb-28 pt-10 lg:grid-cols-[22rem_1fr] lg:gap-20">
      <div className="lg:sticky lg:top-28 lg:self-start">
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
              "flex aspect-[2/3] cursor-pointer flex-col items-center justify-center gap-5 rounded-[4px] border border-dashed px-8 text-center transition-colors",
              dragging
                ? "border-azul-luz bg-azul-luz/10"
                : "border-line bg-ink-2/60 hover:border-white/35 hover:bg-ink-3",
            )}
          >
            <UploadCloud className="h-8 w-8 text-muted" strokeWidth={1.2} />
            <div>
              <p className="font-display text-2xl">Solte o PDF aqui</p>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Ou clique para escolher no computador. Até 200 MB por arquivo.
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
          <div className="space-y-5">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[3px] border border-line bg-ink-2">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Prévia da capa" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center">
                  {reading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted" strokeWidth={1.4} />
                  ) : (
                    <FileText className="h-8 w-8 text-muted" strokeWidth={1.2} />
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={reset}
                aria-label="Remover arquivo"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 backdrop-blur transition-colors hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-muted">
              <p className="truncate text-bone">{file.name}</p>
              <p className="mt-1.5">
                {formatBytes(file.size)}
                {pages ? ` · ${pages} páginas` : reading ? " · lendo o arquivo…" : ""}
              </p>
            </div>

            {progress !== null ? (
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-bone transition-[width] duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="max-w-2xl space-y-10">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="eyebrow">Título *</span>
            <input
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              className="field mt-3"
              placeholder="Estatística Aplicada à Tomada de Decisão"
              required
            />
          </label>

          <label className="sm:col-span-2">
            <span className="eyebrow">Subtítulo</span>
            <input
              value={form.subtitle}
              onChange={(event) => set("subtitle", event.target.value)}
              className="field mt-3"
              placeholder="Da inferência clássica aos modelos preditivos"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="eyebrow">Autores * (separe por vírgula)</span>
            <input
              value={form.authors}
              onChange={(event) => set("authors", event.target.value)}
              className="field mt-3"
              placeholder="Fábio Miranda, Helena Duarte"
              required
            />
          </label>

          <label>
            <span className="eyebrow">Área do curso *</span>
            <input
              value={form.discipline}
              onChange={(event) => set("discipline", event.target.value)}
              list="disciplinas"
              className="field mt-3"
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
            <span className="eyebrow">Formato</span>
            <select
              value={form.kind}
              onChange={(event) => set("kind", event.target.value)}
              className="field mt-3"
            >
              {KINDS.map((kind) => (
                <option key={kind} value={kind} className="bg-ink">
                  {KIND_LABEL[kind]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="eyebrow">Editora</span>
            <input
              value={form.publisher}
              onChange={(event) => set("publisher", event.target.value)}
              className="field mt-3"
              placeholder="Editora Piracicaba"
            />
          </label>

          <label>
            <span className="eyebrow">Ano</span>
            <input
              value={form.year}
              onChange={(event) => set("year", event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              className="field mt-3"
              placeholder="2024"
            />
          </label>

          <label>
            <span className="eyebrow">Edição</span>
            <input
              value={form.edition}
              onChange={(event) => set("edition", event.target.value)}
              className="field mt-3"
              placeholder="3ª edição"
            />
          </label>

          <label>
            <span className="eyebrow">Idioma</span>
            <input
              value={form.language}
              onChange={(event) => set("language", event.target.value)}
              className="field mt-3"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="eyebrow">Palavras-chave</span>
            <input
              value={form.tags}
              onChange={(event) => set("tags", event.target.value)}
              className="field mt-3"
              placeholder="valuation, fluxo de caixa, investimentos"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="eyebrow">Descrição</span>
            <textarea
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              rows={5}
              className="field mt-3"
              placeholder="Em duas ou três frases: o que o material cobre e para quem serve."
            />
          </label>

          <label className="sm:col-span-2">
            <span className="eyebrow">Enviado por</span>
            <input
              value={form.uploadedBy}
              onChange={(event) => set("uploadedBy", event.target.value)}
              className="field mt-3"
              placeholder="Seu nome ou turma"
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-[4px] border border-[#7a3a2c] bg-[#2a1512] px-4 py-3 text-sm text-[#e5a08c]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-8">
          <button
            type="submit"
            disabled={!ready || sending}
            className="btn btn-solid disabled:pointer-events-none disabled:opacity-35"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
                Enviando…
              </>
            ) : (
              "Publicar no acervo"
            )}
          </button>
          <p className="text-xs text-muted">
            Ao publicar, você confirma ter direito de compartilhar este material.
          </p>
        </div>
      </div>
    </form>
  );
}
