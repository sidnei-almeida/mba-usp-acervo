import { SiloGlyph } from "@/components/brand/silo-glyph";
import { cx } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const WORDMARK: Record<Size, string> = {
  sm: "text-[0.9375rem] tracking-[0.34em]",
  md: "text-[1.375rem] tracking-[0.32em]",
  lg: "text-[2.25rem] tracking-[0.3em]",
};

const GLYPH: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

const DESCRIPTOR: Record<Size, string> = {
  sm: "text-[0.5rem] tracking-[0.24em]",
  md: "text-[0.5625rem] tracking-[0.26em]",
  lg: "text-[0.6875rem] tracking-[0.28em]",
};

/**
 * Horizontal lockup: glyph, wordmark set in the display serif, and the
 * institutional descriptor hanging under a hairline.
 */
export function BrandLockup({
  size = "sm",
  descriptor = true,
  className,
}: {
  size?: Size;
  descriptor?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <SiloGlyph className={GLYPH[size]} />
      <span className="leading-none">
        <span className={cx("block font-display uppercase", WORDMARK[size])}>Silo</span>
        {descriptor ? (
          <span
            className={cx(
              "mt-1 block border-t border-current/25 pt-1 uppercase opacity-60",
              DESCRIPTOR[size],
            )}
          >
            Acervo MBA USP/Esalq
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** Stacked lockup for square spaces: glyph over wordmark. */
export function BrandStack({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex flex-col items-center gap-3", className)}>
      <SiloGlyph className="h-12 w-12" />
      <span className="font-display text-[1.75rem] uppercase tracking-[0.3em]">Silo</span>
      <span className="text-[0.5625rem] uppercase tracking-[0.26em] opacity-60">
        Acervo MBA USP/Esalq
      </span>
    </span>
  );
}
