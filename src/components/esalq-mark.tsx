import { cx } from "@/lib/utils";

/**
 * Institutional lockup for the school. Kept as vector so it stays crisp on the
 * dark shell and can be tinted by the surrounding text colour.
 */
export function EsalqMark({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
        <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="3.5" fill="none" stroke="currentColor" strokeOpacity="0.45" />
        <path
          d="M16 6.4c3.7 2.2 5.6 5.2 5.6 8.9 0 4.2-2.5 7.6-5.6 10.3-3.1-2.7-5.6-6.1-5.6-10.3 0-3.7 1.9-6.7 5.6-8.9Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        <path d="M16 9.6v13.4M16 14.2l3.1-2.4M16 18.1l-3.1-2.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      <span className="leading-none">
        <span className="block text-[0.5625rem] uppercase tracking-[0.28em] text-muted">
          MBA USP/Esalq
        </span>
        <span className="mt-1 block font-display text-[1.0625rem] tracking-tight">
          Acervo
        </span>
      </span>
    </span>
  );
}
