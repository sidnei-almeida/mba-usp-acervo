import { SiloGlyph } from "@/components/brand/silo-glyph";
import { cx } from "@/lib/utils";

function monogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase() || "?";
}

/**
 * A contributor's face, in three fallbacks: the photo they uploaded, the house
 * glyph for the archive's own records, and their initials over the accent when
 * neither applies.
 */
export function Avatar({
  name,
  url,
  house,
  accent = "#16324F",
  size = 28,
  className,
}: {
  name: string;
  url?: string;
  house?: boolean;
  accent?: string;
  size?: number;
  className?: string;
}) {
  const box = { width: size, height: size };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Foto de ${name}`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={cx(
          "shrink-0 rounded-[2px] object-cover ring-1 ring-inset ring-white/10",
          className,
        )}
        style={box}
      />
    );
  }

  if (house) {
    return (
      <span
        aria-label={`Marca do ${name}`}
        className={cx(
          "grid shrink-0 place-items-center rounded-[2px] border border-line bg-ink-3",
          className,
        )}
        style={box}
      >
        <SiloGlyph className="text-bone" style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }

  return (
    <span
      aria-label={`Iniciais de ${name}`}
      className={cx(
        "grid shrink-0 place-items-center rounded-[2px] text-white/85 ring-1 ring-inset ring-white/10",
        className,
      )}
      style={{
        ...box,
        fontSize: size * 0.34,
        letterSpacing: "0.04em",
        background: `linear-gradient(150deg, ${accent}, rgba(0,0,0,0.55))`,
      }}
    >
      {monogram(name)}
    </span>
  );
}
