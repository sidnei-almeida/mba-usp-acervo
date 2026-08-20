"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";
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
  const view = params.get("vista") === "indice" ? "indice" : "grade";

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
    const timer = setTimeout(() => apply("q", term || null), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim"
            strokeWidth={1.4}
          />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar por título, autor, tema…"
            aria-label="Buscar no acervo"
            className="field pl-9 pr-9"
          />
          {term ? (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-dim hover:text-bone"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(event) => apply("ordem", event.target.value)}
            aria-label="Ordenar"
            className="field h-9 w-auto text-[0.625rem] uppercase tracking-[0.14em]"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value} className="bg-ink">
                {option.label}
              </option>
            ))}
          </select>

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
                onClick={() => apply("vista", option.value === "grade" ? null : option.value)}
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
          onClick={() => apply("disciplina", null)}
          className={cx("chip", discipline === "todas" && "chip-on")}
        >
          Todas
        </button>
        {disciplines.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => apply("disciplina", item.name)}
            className={cx("chip", discipline === item.name && "chip-on")}
          >
            {item.name}
            <span className="opacity-45">{String(item.count).padStart(2, "0")}</span>
          </button>
        ))}
      </div>

      <div className="rail gap-1.5 border-t border-line pt-3 pb-1">
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
    </div>
  );
}
