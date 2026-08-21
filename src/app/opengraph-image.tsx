import { ImageResponse } from "next/og";
import { listBooks } from "@/lib/catalog";
import { disciplinesOf } from "@/lib/catalog";
import { ogFontOptions } from "@/lib/og-fonts";

export const alt = "Silo — Acervo MBA Data Science";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Cartão do site inteiro, para quando o link compartilhado é a home. */
export default async function Image() {
  const fonts = await ogFontOptions();
  const books = await listBooks().catch(() => []);
  const paginas = books.reduce((total, book) => total + (book.pages ?? 0), 0);

  const numeros = [
    { valor: String(books.length).padStart(2, "0"), rotulo: "títulos" },
    { valor: String(disciplinesOf(books).length).padStart(2, "0"), rotulo: "áreas" },
    { valor: paginas.toLocaleString("pt-BR"), rotulo: "páginas" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#08090a",
          color: "#efece5",
          fontFamily: "Inter Tight",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 19,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: "#85888c",
            }}
          >
            Acervo MBA Data Science
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontSize: 108,
              letterSpacing: 24,
              marginTop: 26,
            }}
          >
            SILO
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              marginTop: 26,
              color: "#b9bbbe",
              maxWidth: 760,
            }}
          >
            A estante que a turma montou: livros, apostilas e casos em PDF, num
            endereço fixo e pesquisável.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 64,
            borderTop: "1px solid rgba(239,236,229,0.14)",
            paddingTop: 28,
          }}
        >
          {numeros.map((item) => (
            <div key={item.rotulo} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 52 }}>
                {item.valor}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 17,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: "#85888c",
                  marginTop: 8,
                }}
              >
                {item.rotulo}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
