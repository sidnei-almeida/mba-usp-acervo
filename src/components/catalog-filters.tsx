"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { KINDS, KIND_LABEL } from "@/lib/types";
import { cx } from "@/lib/utils";

const SORTS = [
  { value: "recentes", label: "Recentes" },
  { value: "populares", label: "Mais baixados" },
  { value: "titulo", label: "A–Z" },
  { value: "ano", label: "Ano" },
] as const;

export function CatalogFilters({
  disciplines,
  autoFocus,
}: {
  disciplines: { name: string; count: number }[];
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState(params.get("q") ?? "");

  const discipline = params.get("disciplina") ?? "todas";
  const kind = params.get("tipo") ?? "todos";
  const sort = params.get("ordem") ?? "recentes";

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const apply = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    next.delete("foco");
    if (!value || value === "todas" || value === "todos") next.delete(key);
    else next.set(key, value);
    router.replace(next.size ? `/acervo?${next}` : "/acervo", { scroll: false });
  };

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (term === current) return;
    const timer = setTimeout(() => apply("q", term || null), 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <div className="space-y-7">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-muted"
          strokeWidth={1.5}
        />
        <input
          ref={inputRef}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar por título, autor, tema…"
          aria-label="Buscar no acervo"
          className="field h-14 pl-12 pr-12 text-base"
        />
        {term ? (
          <button
            type="button"
            onClick={() => setTerm("")}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-bone"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="rail -mx-1 gap-2 px-1 pb-1">
        <button
          type="button"
          onClick={() => apply("disciplina", null)}
          className={cx("chip", discipline === "todas" && "chip-on")}
        >
          Todas as áreas
        </button>
        {disciplines.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => apply("disciplina", item.name)}
            className={cx("chip", discipline === item.name && "chip-on")}
          >
            {item.name}
            <span className="opacity-50">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <div className="rail -mx-1 gap-2 px-1">
          <button
            type="button"
            onClick={() => apply("tipo", null)}
            className={cx("chip", kind === "todos" && "chip-on")}
          >
            Tudo
          </button>
          {KINDS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => apply("tipo", item)}
              className={cx("chip", kind === item && "chip-on")}
            >
              {KIND_LABEL[item]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.18em] text-muted">
          Ordenar
          <select
            value={sort}
            onChange={(event) => apply("ordem", event.target.value)}
            className="h-9 rounded-full border border-line bg-transparent px-3 text-[0.75rem] tracking-normal text-bone outline-none focus:border-bone"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value} className="bg-ink">
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
