import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import { LibrarianChat } from "@/components/librarian-chat";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteOrigin } from "@/lib/site";
import { assetOrigin } from "@/lib/storage";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  // Sem base absoluta, o Next emite caminhos relativos e o mensageiro
  // descarta a imagem do cartão sem avisar.
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Silo — Acervo MBA Data Science",
    template: "%s — Silo",
  },
  description:
    "Silo é a biblioteca digital dos alunos do MBA em Data Science: livros, apostilas, casos e artigos em PDF, reunidos em um só lugar.",
  openGraph: {
    title: "Silo — Acervo MBA Data Science",
    description:
      "Biblioteca digital dos alunos do MBA em Data Science: livros, apostilas, casos e artigos em PDF.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const assets = assetOrigin();

  return (
    /* Smooth scrolling is for anchors only. Next 16 stopped suspending it on
       its own, so without this attribute every route change animates its way
       to the top instead of arriving there. */
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${interTight.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      {/* Warms the TLS handshake with the store before the first cover. */}
      {assets ? (
        <head>
          {/* Sem crossOrigin: as capas são <img> comuns e usariam outro pool
              de conexões, desperdiçando o aquecimento. */}
          <link rel="preconnect" href={assets} />
          <link rel="dns-prefetch" href={assets} />
        </head>
      ) : null}
      <body className="grain flex min-h-full flex-col bg-ink text-bone">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <LibrarianChat />
      </body>
    </html>
  );
}
