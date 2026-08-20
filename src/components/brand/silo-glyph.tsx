import { cx } from "@/lib/utils";

/**
 * The mark: a silo in silhouette — shallow dome, one ring, standing on its
 * plinth. A single path in `currentColor`, still legible at 16px.
 */
export function SiloGlyph({
  className,
  style,
  variant = "solid",
}: {
  className?: string;
  style?: React.CSSProperties;
  variant?: "solid" | "outline";
}) {
  if (variant === "outline") {
    return (
      <svg viewBox="0 0 24 24" className={cx("shrink-0", className)} style={style} aria-hidden="true">
        <path
          d="M7.65 22.35V11.6a4.35 3.3 0 0 1 8.7 0v10.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M7.65 16.6h8.7M5.2 23.45h13.6"
          stroke="currentColor"
          strokeWidth="1.25"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={cx("shrink-0", className)} style={style} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7 22V11.6a5 3.8 0 0 1 10 0V22H7Zm0.15-6.1h9.7v1.45h-9.7V15.9ZM5.2 22.85h13.6v1.15H5.2v-1.15Z"
      />
    </svg>
  );
}
