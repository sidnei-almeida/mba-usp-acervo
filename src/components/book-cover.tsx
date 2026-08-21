"use client";

import { useState } from "react";
import { SiloGlyph } from "@/components/brand/silo-glyph";
import { coverFallbackSrc, coverSrc } from "@/lib/cover-src";
import type { Book } from "@/lib/types";
import { cx } from "@/lib/utils";

function shade(hex: string, amount: number) {
  const value = hex.replace("#", "");
  const rgb = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  const mixed = rgb.map((channel) => Math.max(0, Math.min(255, Math.round(channel + amount))));
  return `rgb(${mixed.join(",")})`;
}

/**
 * Artwork when we have it, a typographic cover when we do not — and also when a
 * remote cover fails to load, so a dead image never reaches the page.
 */
export function BookCover({
  book,
  className,
  priority,
}: {
  book: Book;
  className?: string;
  priority?: boolean;
}) {
  // 0 = stored copy, 1 = provider URL, 2 = give up and draw the cover.
  const [stage, setStage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = stage === 0 ? coverSrc(book) : stage === 1 ? coverFallbackSrc(book) : null;

  return (
    <div
      className={cx(
        "relative isolate aspect-[2/3] w-full overflow-hidden rounded-[2px] bg-ink-3",
        className,
      )}
      style={{ containerType: "inline-size" }}
    >
      {src ? (
        <>
          {/* Held place, in the site's own material — never a grey block. */}
          {!loaded ? (
            <span aria-hidden className="cover-skeleton">
              <SiloGlyph
                className="breathe absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/12"
                style={{ width: "22cqw", height: "22cqw" }}
              />
            </span>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            ref={(node) => {
              // A cached image can be complete before React attaches onLoad.
              if (node?.complete && node.naturalWidth > 0) setLoaded(true);
            }}
            src={src}
            alt={`Capa de ${book.title}`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => {
              setLoaded(false);
              setStage((current) => current + 1);
            }}
            className={cx(
              "relative h-full w-full object-cover transition-opacity duration-500 ease-out",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      ) : (
        <div
          className="flex h-full w-full flex-col"
          style={{
            padding: "7cqw",
            background: `linear-gradient(155deg, ${shade(book.accent, 26)} 0%, ${book.accent} 46%, ${shade(book.accent, -34)} 100%)`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 70% at 18% 6%, rgba(255,255,255,0.2), transparent 58%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0"
            style={{
              width: "6.5cqw",
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.42), rgba(0,0,0,0.05) 62%, rgba(255,255,255,0.14))",
            }}
          />

          <div className="relative flex items-center justify-between text-white/70">
            <span style={{ fontSize: "2.9cqw", letterSpacing: "0.22em" }} className="uppercase">
              {book.publisher ?? "Silo"}
            </span>
            <span style={{ fontSize: "2.9cqw" }} className="tabular-nums text-white/55">
              {book.year ?? ""}
            </span>
          </div>

          <div className="relative mt-auto">
            <div className="mb-[5cqw] bg-white/45" style={{ height: "1px", width: "18%" }} />
            <p
              className="font-display text-white"
              style={{ fontSize: "10.5cqw", lineHeight: 0.95 }}
            >
              {book.title}
            </p>
            {book.subtitle ? (
              <p
                className="mt-[3cqw] text-white/65"
                style={{ fontSize: "3.6cqw", lineHeight: 1.35 }}
              >
                {book.subtitle}
              </p>
            ) : null}
          </div>

          <div className="relative mt-[8cqw] flex items-end justify-between gap-[4cqw]">
            <p
              className="uppercase text-white/75"
              style={{ fontSize: "2.9cqw", letterSpacing: "0.16em" }}
            >
              {book.authors[0]}
              {book.authors.length > 1 ? " e outros" : ""}
            </p>
            <SiloGlyph
              className="shrink-0 text-white/45"
              style={{ width: "5cqw", height: "5cqw" }}
            />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}
