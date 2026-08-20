"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { EsalqMark } from "@/components/esalq-mark";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "/acervo", label: "Acervo" },
  { href: "/colecoes", label: "Coleções" },
  { href: "/sobre", label: "Sobre" },
];

export function HeaderShell({ user }: { user: { name: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signOut = async () => {
    await fetch("/api/sessao", { method: "DELETE" });
    setOpen(false);
    router.refresh();
  };

  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled || open ? "border-line bg-ink/90 backdrop-blur-md" : "border-transparent",
      )}
    >
      <div className="shell flex h-[var(--header)] items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Início">
            <EsalqMark className="transition-opacity hover:opacity-70" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "underline-grow text-[0.625rem] uppercase tracking-[0.2em] transition-colors",
                  pathname.startsWith(item.href) ? "text-bone" : "text-muted hover:text-bone",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/acervo?foco=busca"
            aria-label="Buscar"
            className="grid h-8 w-8 place-items-center text-muted transition-colors hover:text-bone"
          >
            <Search className="h-4 w-4" strokeWidth={1.4} />
          </Link>

          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              <Link href="/enviar" className="btn btn-ghost">
                Enviar
              </Link>
              <span className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">
                {user.name}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="underline-grow text-[0.625rem] uppercase tracking-[0.16em] text-dim hover:text-bone"
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/entrar" className="btn btn-ghost">
                Entrar
              </Link>
              <Link href="/criar-conta" className="btn btn-solid">
                Criar conta
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="grid h-8 w-8 place-items-center text-bone md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="shell border-t border-line py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-[0.75rem] uppercase tracking-[0.2em]"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-4">
              {user ? (
                <>
                  <Link href="/enviar" onClick={() => setOpen(false)} className="btn btn-solid">
                    Enviar material
                  </Link>
                  <button type="button" onClick={signOut} className="btn btn-ghost">
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link href="/entrar" onClick={() => setOpen(false)} className="btn btn-ghost">
                    Entrar
                  </Link>
                  <Link href="/criar-conta" onClick={() => setOpen(false)} className="btn btn-solid">
                    Criar conta
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
