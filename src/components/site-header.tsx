"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { EsalqMark } from "@/components/esalq-mark";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "/acervo", label: "Acervo" },
  { href: "/colecoes", label: "Coleções" },
  { href: "/sobre", label: "Sobre" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        scrolled || open
          ? "border-b border-line bg-ink/85 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="shell flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" aria-label="Página inicial do Acervo">
          <EsalqMark className="text-bone transition-opacity hover:opacity-80" />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "link-underline text-[0.8125rem] uppercase tracking-[0.16em] transition-colors",
                pathname.startsWith(item.href) ? "text-bone" : "text-muted hover:text-bone",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/acervo?foco=busca"
            aria-label="Buscar no acervo"
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-bone"
          >
            <Search className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.5} />
          </Link>
          <Link href="/enviar" className="btn btn-solid hidden md:inline-flex">
            Enviar material
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="grid h-10 w-10 place-items-center rounded-full text-bone transition-colors hover:bg-white/5 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="shell border-t border-line pb-8 pt-6 md:hidden">
          <div className="flex flex-col gap-5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-display text-3xl text-bone"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/enviar"
              onClick={() => setOpen(false)}
              className="btn btn-solid mt-2 self-start"
            >
              Enviar material
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
