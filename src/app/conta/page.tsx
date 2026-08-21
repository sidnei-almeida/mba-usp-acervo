import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AvatarPicker } from "@/components/avatar-picker";
import { BookCard } from "@/components/book-card";
import { currentUser } from "@/lib/auth";
import { portraitOf } from "@/lib/avatar-url";
import { listBooks } from "@/lib/catalog";
import { withCoverUrls } from "@/lib/cover-url";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sua conta",
  description: "Foto de perfil e material que você enviou para o acervo.",
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/entrar?proximo=/conta");

  const portrait = await portraitOf(user);
  const all = await listBooks();
  const mine = await withCoverUrls(all.filter((book) => book.uploadedById === user.id));

  const pages = mine.reduce((total, book) => total + (book.pages ?? 0), 0);
  const downloads = mine.reduce((total, book) => total + book.downloads, 0);

  const stats = [
    { value: String(mine.length).padStart(2, "0"), label: "títulos enviados" },
    { value: pages.toLocaleString("pt-BR"), label: "páginas" },
    { value: downloads.toLocaleString("pt-BR"), label: "downloads gerados" },
    { value: formatDate(user.createdAt), label: "na turma desde" },
  ];

  return (
    <div className="pt-[var(--header)]">
      <section className="shell pt-10">
        <div className="flex items-center gap-3">
          <span className="num">Conta</span>
          <span className="h-px w-8 bg-line" />
          <span className="label">
            {user.role === "admin" ? "Curadoria" : "Membro"}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <h1 className="display text-[clamp(1.75rem,4vw,3rem)]">
            {user.name ?? user.username}
          </h1>
          <p className="label">@{user.username}</p>
        </div>
      </section>

      <section className="shell py-9">
        <div className="mb-6 flex items-baseline gap-3 border-b border-line pb-2.5">
          <span className="num">01</span>
          <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">Retrato</h2>
        </div>
        <AvatarPicker name={portrait.name} initialUrl={portrait.url} house={portrait.house} />
      </section>

      <section className="border-y border-line">
        <div className="shell grid grid-cols-2 divide-x divide-[color:var(--color-line)] md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="px-4 py-6 first:pl-0 last:pr-0">
              <p className="display text-[1.5rem] leading-none">{stat.value}</p>
              <p className="label mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell py-9">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-2.5">
          <div className="flex items-baseline gap-3">
            <span className="num">02</span>
            <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">O que você enviou</h2>
          </div>
          <Link
            href="/enviar"
            className="underline-grow text-[0.625rem] uppercase tracking-[0.2em] text-muted hover:text-bone"
          >
            Enviar material
          </Link>
        </div>

        {mine.length === 0 ? (
          <div className="py-14 text-center">
            <p className="display text-2xl">Sua prateleira está vazia.</p>
            <p className="prose-sm mt-3">
              O primeiro PDF que você subir aparece aqui — e leva seu nome na ficha.
            </p>
            <Link href="/enviar" className="btn btn-solid mt-6">
              Enviar o primeiro
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
            {mine.map((book, index) => (
              <BookCard key={book.id} book={book} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
