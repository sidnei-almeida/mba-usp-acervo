import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
  title: {
    default: "Acervo — MBA USP/Esalq",
    template: "%s — Acervo MBA USP/Esalq",
  },
  description:
    "Biblioteca digital dos alunos do MBA USP/Esalq: livros, apostilas, casos e artigos em PDF, reunidos em um só lugar.",
  openGraph: {
    title: "Acervo — MBA USP/Esalq",
    description:
      "Biblioteca digital dos alunos do MBA USP/Esalq: livros, apostilas, casos e artigos em PDF.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${interTight.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="grain flex min-h-full flex-col bg-ink text-bone">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
