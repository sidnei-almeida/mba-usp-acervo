import { ImageResponse } from "next/og";
import { getBookBySlug } from "@/lib/catalog";
import { resolveCoverUrl } from "@/lib/cover-url";
import { ogFontOptions } from "@/lib/og-fonts";
import { KIND_LABEL } from "@/lib/types";

export const alt = "Ficha do título no Silo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** O cartão que aparece quando alguém cola o link num mensageiro. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  const fonts = await ogFontOptions();

  if (!book) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#08090a",
            color: "#efece5",
            fontFamily: "Instrument Serif",
            fontSize: 64,
          }}
        >
          Silo
        </div>
      ),
      { ...size, fonts },
    );
  }

  const cover = await resolveCoverUrl(book);
  const ficha = [
    KIND_LABEL[book.kind],
    book.discipline,
    book.year ? String(book.year) : null,
    book.pages ? `${book.pages} páginas` : null,
  ].filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#08090a",
          color: "#efece5",
          fontFamily: "Inter Tight",
          position: "relative",
        }}
      >
        {/* Mesmo brilho de fundo da ficha, na cor do título. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(60% 90% at 20% 0%, ${book.accent}66, transparent 70%)`,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", padding: 64, gap: 56, width: "100%", alignItems: "center" }}>
          {cover ? (
            <img
              src={cover}
              width={300}
              height={450}
              style={{
                objectFit: "cover",
                borderRadius: 2,
                border: "1px solid rgba(239,236,229,0.14)",
              }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: 300,
                height: 450,
                display: "flex",
                borderRadius: 2,
                background: `linear-gradient(150deg, ${book.accent}, rgba(0,0,0,0.6))`,
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#85888c",
              }}
            >
              Silo · Acervo MBA Data Science
            </div>

            <div
              style={{
                display: "flex",
                fontFamily: "Instrument Serif",
                fontSize: book.title.length > 44 ? 58 : 74,
                lineHeight: 1.03,
                marginTop: 22,
                color: "#efece5",
              }}
            >
              {book.title.slice(0, 90)}
            </div>

            <div style={{ display: "flex", fontSize: 26, marginTop: 20, color: "#b9bbbe" }}>
              {book.authors.slice(0, 3).join(" · ").slice(0, 70)}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 34,
                paddingTop: 20,
                borderTop: "1px solid rgba(239,236,229,0.14)",
                gap: 22,
                fontSize: 19,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#85888c",
              }}
            >
              {ficha.map((item) => (
                <div key={item} style={{ display: "flex" }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
