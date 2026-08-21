"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { BookCard } from "@/components/book-card";
import { SelectField } from "@/components/select-field";
import { BookLedger } from "@/components/book-ledger";
import type { Book } from "@/lib/types";
import { KINDS, KIND_LABEL } from "@/lib/types";
import {
  buildIndex,
  filtersFromParams,
  paramsFromFilters,
  runSearch,
  type Filters,
  type SortKey,
} from "@/lib/search";
import { cx } from "@/lib/utils";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "recentes", label: "Recentes" },
  { value: "populares", label: "Mais baixados" },
  { value: "titulo", label: "A–Z" },
  { value: "ano", label: "Ano" },
];

export function CatalogBrowser({
  books,
  disciplines,
  initialFilters,
  initialView,
  autoFocus,
}: {
  books: Book[];
  disciplines: { name: string; count: number }[];
  initialFilters: Filters;
  initialView: "grade" | "indice";
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [view, setView] = useState(initialView);
  // Whatever this component last pushed into the URL itself.
  const ownWrite = useRef(paramsFromFilters(initialFilters, initialView).toString());

  // Everything runs against a prepared index, so typing never hits the server.
  const index = useMemo(() => buildIndex(books), [books]);
  const deferredQuery = useDeferredValue(filters.q);
  const results = useMemo(
    () => runSearch(index, { ...filters, q: deferredQuery }),
    [index, filters, deferredQuery],
  );
  const settling = filters.q !== deferredQuery;

  const set = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) =>
      setFilters((current) => ({ ...current, [key]: value })),
    [],
  );

  // The URL follows the state without a navigation, so links stay shareable.
  useEffect(() => {
    const params = paramsFromFilters(filters, view).toString();
    const next = params ? `/acervo?${params}` : "/acervo";
    ownWrite.current = params;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", next);
    }
  }, [filters, view]);

  /**
   * A link back into /acervo with other params is a soft navigation: React
   * keeps this component mounted, so the filters would stay on whatever the
   * visitor had picked before and the link would look dead. Anything in the
   * URL that this component did not write itself wins over local state.
   */
  const query = searchParams.toString();
  useEffect(() => {
    if (query === ownWrite.current) return;
    ownWrite.current = query;
    const params = new URLSearchParams(query);
    setFilters(filtersFromParams(params));
    setView(params.get("vista") === "indice" ? "indice" : "grade");
  }, [query]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        set("q", "");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set]);

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim"
              strokeWidth={1.4}
            />
            <input
              ref={inputRef}
              value={filters.q}
              onChange={(event) => set("q", event.target.value)}
              placeholder="Buscar por título, autor, tema…"
              aria-label="Buscar no acervo"
              className="field pl-9 pr-16"
            />
            {filters.q ? (
              <button
                type="button"
                onClick={() => {
                  set("q", "");
                  inputRef.current?.focus();
                }}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-dim hover:text-bone"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border border-line px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-[0.14em] text-dim">
                /
              </kbd>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SelectField
              label="Ordenar"
              value={filters.sort}
              options={SORTS.map((option) => ({ value: option.value, label: option.label }))}
              onChange={(value) => set("sort", value as SortKey)}
              className="w-[9.5rem]"
            />

            <div className="flex border border-line">
              {(
                [
                  { value: "grade", icon: LayoutGrid, label: "Ver em grade" },
                  { value: "indice", icon: List, label: "Ver como índice" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={view === option.value}
                  onClick={() => setView(option.value)}
                  className={cx(
                    "grid h-9 w-9 place-items-center transition-colors",
                    view === option.value
                      ? "bg-bone text-[#0a0b0c]"
                      : "text-muted hover:text-bone",
                  )}
                >
                  <option.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rail gap-1.5 pb-1">
          <button
            type="button"
            onClick={() => set("discipline", "todas")}
            className={cx("chip", filters.discipline === "todas" && "chip-on")}
          >
            Todas
          </button>
          {disciplines.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() =>
                set("discipline", filters.discipline === item.name ? "todas" : item.name)
              }
              className={cx("chip", filters.discipline === item.name && "chip-on")}
            >
              {item.name}
              <span className="opacity-45">{String(item.count).padStart(2, "0")}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="rail gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => set("kind", "todos")}
              className={cx("chip", filters.kind === "todos" && "chip-on")}
            >
              Tudo
            </button>
            {KINDS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => set("kind", filters.kind === item ? "todos" : item)}
                className={cx("chip", filters.kind === item && "chip-on")}
              >
                {KIND_LABEL[item]}
              </button>
            ))}
          </div>

          <p className="label whitespace-nowrap">
            {String(results.length).padStart(2, "0")}{" "}
            {results.length === 1 ? "resultado" : "resultados"}
          </p>
        </div>
      </div>

      <div
        className={cx(
          "mt-6 transition-opacity duration-150",
          settling ? "opacity-60" : "opacity-100",
        )}
      >
        {results.length === 0 ? (
          <div className="border-t border-line py-16 text-center">
            <p className="display text-2xl">Nada encontrado.</p>
            <p className="prose-sm mt-3">
              Tente outro termo ou tire um filtro — o acervo tem {books.length} títulos.
            </p>
          </div>
        ) : view === "indice" ? (
          <BookLedger books={results} />
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-7 border-t border-line pt-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
            {results.map((book, position) => (
              <BookCard key={book.id} book={book} index={position} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
