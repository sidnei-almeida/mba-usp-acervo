"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import type { Book } from "@/lib/types";
import { KINDS, KIND_LABEL, type Kind } from "@/lib/types";

type Draft = {
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

function draftFrom(book: Book): Draft {
  return {
    title: book.title,
    subtitle: book.subtitle ?? "",
    authors: book.authors.join(", "),
    year: book.year ? String(book.year) : "",
    publisher: book.publisher ?? "",
    edition: book.edition ?? "",
    isbn: book.isbn ?? "",
    language: book.language,
    discipline: book.discipline,
    kind: book.kind,
    tags: book.tags.join(", "),
    description: book.description ?? "",
  };
}

/**
 * Correcting a record in place. Open to whoever may manage the title — the
 * contributor for their own submission, the curator for anything on the shelf.
 */
export function EditBook({ book, disciplines }: { book: Book; disciplines: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(book));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/livros/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          subtitle: draft.subtitle.trim(),
          authors: draft.authors
            .split(/[,;]/)
            .map((author) => author.trim())
            .filter(Boolean),
          year: draft.year ? Number(draft.year) : null,
          publisher: draft.publisher.trim(),
          edition: draft.edition.trim(),
          isbn: draft.isbn.trim(),
          language: draft.language.trim() || "Português",
          discipline: draft.discipline.trim(),
          kind: draft.kind,
          tags: draft.tags
            .split(/[,;]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
          description: draft.description.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        book?: Book;
        error?: string;
      };
      if (!response.ok || !data.book) {
        throw new Error(data.error ?? "Não foi possível salvar.");
      }

      // The record comes back normalised; the form shows what was really stored.
      setDraft(draftFrom(data.book));
      setSaved(true);
      router.refresh();
      // A changed title changes the address of this page.
      if (data.book.slug !== book.slug) router.replace(`/livro/${data.book.slug}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="underline-grow inline-flex items-center gap-2 self-start text-[0.6875rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-bone"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
        Editar ficha
      </button>
    );
  }

  return (
    <form onSubmit={save} className="border border-line bg-ink-2/60 p-4">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
        <span className="label">Editar ficha</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="underline-grow text-[0.625rem] uppercase tracking-[0.16em] text-dim hover:text-bone"
        >
          Fechar
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Título</span>
          <input
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            className="field mt-1.5"
            required
          />
        </label>

        <label className="sm:col-span-2">
          <span className="label">Subtítulo</span>
          <input
            value={draft.subtitle}
            onChange={(event) => set("subtitle", event.target.value)}
            className="field mt-1.5"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="label">Autores (vírgula separa)</span>
          <input
            value={draft.authors}
            onChange={(event) => set("authors", event.target.value)}
            className="field mt-1.5"
            required
          />
        </label>

        <label>
          <span className="label">Área</span>
          <input
            value={draft.discipline}
            onChange={(event) => set("discipline", event.target.value)}
            list="editar-disciplinas"
            className="field mt-1.5"
            required
          />
          <datalist id="editar-disciplinas">
            {disciplines.map((discipline) => (
              <option key={discipline} value={discipline} />
            ))}
          </datalist>
        </label>

        <label>
          <span className="label">Formato</span>
          <select
            value={draft.kind}
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
          <span className="label">Editora</span>
          <input
            value={draft.publisher}
            onChange={(event) => set("publisher", event.target.value)}
            className="field mt-1.5"
          />
        </label>

        <label>
          <span className="label">Ano</span>
          <input
            value={draft.year}
            onChange={(event) => set("year", event.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            className="field mt-1.5"
          />
        </label>

        <label>
          <span className="label">Edição</span>
          <input
            value={draft.edition}
            onChange={(event) => set("edition", event.target.value)}
            className="field mt-1.5"
          />
        </label>

        <label>
          <span className="label">Idioma</span>
          <input
            value={draft.language}
            onChange={(event) => set("language", event.target.value)}
            className="field mt-1.5"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="label">ISBN</span>
          <input
            value={draft.isbn}
            onChange={(event) => set("isbn", event.target.value)}
            className="field mt-1.5"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="label">Palavras-chave</span>
          <input
            value={draft.tags}
            onChange={(event) => set("tags", event.target.value)}
            className="field mt-1.5"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="label">Descrição</span>
          <textarea
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
            rows={4}
            className="field mt-1.5"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 border border-[#6f3226] bg-[#22110e] px-3 py-2 text-[0.75rem] text-[#e5a08c]">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-solid disabled:pointer-events-none disabled:opacity-40"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
              Salvando…
            </>
          ) : (
            "Salvar ficha"
          )}
        </button>

        {saved && !saving ? (
          <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-dim">
            <Check className="h-3 w-3" strokeWidth={1.8} />
            Salvo e padronizado
          </span>
        ) : null}
      </div>
    </form>
  );
}
