import { cx } from "@/lib/utils";

/** Compact institutional lockup: a wheat glyph plus the school line. */
export function EsalqMark({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
        <path
          d="M12 3.4c2.9 1.8 4.4 4.2 4.4 7.2 0 3.4-2 6.2-4.4 8.4-2.4-2.2-4.4-5-4.4-8.4 0-3 1.5-5.4 4.4-7.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M12 6v13M12 10l2.4-1.9M12 13.2l-2.4-1.9"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
      <span className="leading-none">
        <span className="block text-[0.5rem] uppercase tracking-[0.26em] text-muted">
          MBA USP/Esalq
        </span>
        <span className="mt-[3px] block text-[0.75rem] uppercase tracking-[0.22em]">
          Acervo
        </span>
      </span>
    </span>
  );
}
