import { cx } from "@/lib/utils";

/**
 * The mark: a silo in silhouette, cut by two rings.
 * One path, `currentColor`, legible down to 16px.
 */
export function SiloGlyph({
  className,
  variant = "solid",
}: {
  className?: string;
  variant?: "solid" | "outline";
}) {
  if (variant === "outline") {
    return (
      <svg viewBox="0 0 24 24" className={cx("shrink-0", className)} aria-hidden="true">
        <path
          d="M7.7 22.3V12a4.3 4.3 0 0 1 8.6 0v10.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M7.7 15.9h8.6M5.4 23.4h13.2"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="butt"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={cx("shrink-0", className)} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7 22V12a5 5 0 0 1 10 0v10H7Zm0-6.7h10v1.35H7V15.3ZM5.4 22.9h13.2v1.15H5.4v-1.15Z"
      />
    </svg>
  );
}
