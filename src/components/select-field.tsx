"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cx } from "@/lib/utils";

export type Option = { value: string; label: string; hint?: string };

/**
 * O <select> nativo desenha o popup pelo sistema operacional: o CSS não alcança
 * a lista aberta, então ela sempre destoa do resto. Este componente reconstrói
 * o controle com a geometria da casa — filete, canto de 2px, osso sobre tinta —
 * mantendo teclado e leitor de tela funcionando como no elemento original.
 */
export function SelectField({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const chosen = options.find((option) => option.value === value) ?? options[0];

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-ativo="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const escolher = (option: Option) => {
    onChange(option.value);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open && (event.key === "Enter" || event.key === " " || event.key === "ArrowDown")) {
      event.preventDefault();
      setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % options.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      escolher(options[active]);
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    }
  };

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cx(
          "field flex items-center justify-between gap-2 text-left",
          open && "border-white/45",
        )}
      >
        <span className="truncate">{chosen?.label}</span>
        <ChevronDown
          className={cx(
            "h-3.5 w-3.5 shrink-0 text-dim transition-transform duration-200",
            open && "rotate-180 text-bone",
          )}
          strokeWidth={1.6}
        />
      </button>

      {open ? (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className="absolute left-0 right-0 top-[calc(100%+2px)] z-40 max-h-64 overflow-y-auto border border-line bg-ink-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)]"
        >
          {options.map((option, index) => {
            const selecionado = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selecionado}
                data-ativo={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => escolher(option)}
                className={cx(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] transition-colors",
                  index === active ? "bg-ink-3 text-bone" : "text-[#a6a8ab]",
                )}
              >
                <Check
                  className={cx("h-3 w-3 shrink-0", selecionado ? "text-bone" : "opacity-0")}
                  strokeWidth={2}
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint ? <span className="num shrink-0">{option.hint}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
