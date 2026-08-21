import { SiloGlyph } from "@/components/brand/silo-glyph";
import { cx } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const WORDMARK: Record<Size, string> = {
  sm: "text-[1.0625rem] tracking-[0.3em]",
  md: "text-[1.5rem] tracking-[0.3em]",
  lg: "text-[2.5rem] tracking-[0.28em]",
};

const GLYPH: Record<Size, string> = {
  sm: "h-[1.4rem] w-[1.4rem]",
  md: "h-[1.9rem] w-[1.9rem]",
  lg: "h-[3rem] w-[3rem]",
};

const DESCRIPTOR: Record<Size, string> = {
  sm: "text-[0.5rem] tracking-[0.22em]",
  md: "text-[0.5625rem] tracking-[0.24em]",
  lg: "text-[0.6875rem] tracking-[0.26em]",
};

const GAP: Record<Size, string> = {
  sm: "gap-2",
  md: "gap-2.5",
  lg: "gap-4",
};

/**
 * Glyph and wordmark share a baseline; the hairline runs the full width of the
 * lockup, with the institutional line hanging beneath it.
 */
export function BrandLockup({
  size = "sm",
  descriptor = true,
  inline = false,
  className,
}: {
  size?: Size;
  descriptor?: boolean;
  /** Single-line arrangement for bars and headers. */
  inline?: boolean;
  className?: string;
}) {
  if (inline) {
    return (
      <span className={cx("inline-flex items-center", GAP[size], className)}>
        <SiloGlyph className={GLYPH[size]} />
        <span
          className={cx("font-display uppercase leading-none", WORDMARK[size])}
          style={{ marginRight: "-0.3em" }}
        >
          Silo
        </span>
        {descriptor ? (
          <>
            <span className="h-4 w-px bg-current opacity-20" />
            <span
              className={cx("uppercase leading-none opacity-55", DESCRIPTOR[size])}
            >
              Acervo MBA Data Science
            </span>
          </>
        ) : null}
      </span>
    );
  }

  return (
    <span className={cx("inline-flex flex-col items-stretch", className)}>
      <span className={cx("inline-flex items-center", GAP[size])}>
        <SiloGlyph className={GLYPH[size]} />
        {/* The right margin cancels the trailing letter-space so the rule aligns. */}
        <span
          className={cx("font-display uppercase leading-none", WORDMARK[size])}
          style={{ marginRight: "-0.3em" }}
        >
          Silo
        </span>
      </span>

      {descriptor ? (
        <span
          className={cx(
            "mt-1.5 border-t border-current/25 pt-1 uppercase leading-none opacity-60",
            DESCRIPTOR[size],
          )}
        >
          Acervo MBA Data Science
        </span>
      ) : null}
    </span>
  );
}

/** Stacked lockup for square spaces: glyph over wordmark. */
export function BrandStack({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex flex-col items-center", className)}>
      <SiloGlyph className="h-14 w-14" />
      <span
        className="mt-4 font-display text-[1.875rem] uppercase leading-none"
        style={{ letterSpacing: "0.28em", marginRight: "-0.28em" }}
      >
        Silo
      </span>
      <span className="mt-3 border-t border-current/25 pt-2 text-[0.5625rem] uppercase tracking-[0.24em] opacity-60">
        Acervo MBA Data Science
      </span>
    </span>
  );
}
