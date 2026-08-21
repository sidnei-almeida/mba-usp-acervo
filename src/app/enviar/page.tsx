import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UploadStudio } from "@/components/upload/upload-studio";
import { currentUser } from "@/lib/auth";
import { disciplinesOf, listBooks } from "@/lib/catalog";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enviar material",
  description: "Envie livros, apostilas e casos em PDF para o acervo do MBA em Data Science.",
};

export default async function UploadPage() {
  const user = await currentUser();
  if (!user) redirect("/entrar?proximo=/enviar");

  const books = await listBooks();
  const disciplines = disciplinesOf(books).map((discipline) => discipline.name);

  return (
    <div className="pt-[var(--header)]">
      <section className="shell pt-10">
        <div className="flex items-center gap-3">
          <span className="num">003</span>
          <span className="h-px w-8 bg-line" />
          <span className="label">Sala de envio</span>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <h1 className="display text-[clamp(1.75rem,4vw,3rem)]">
            Coloque um novo título na estante.
          </h1>
          <p className="label">
            Publicando como {user.name ?? user.username}
          </p>
        </div>
        {storage().name === "local" ? (
          <p className="mt-3 text-[0.6875rem] text-[#d8b451]">
            Modo local: sem credenciais de armazenamento, os arquivos ficam em
            .data/ neste computador.
          </p>
        ) : null}
      </section>

      <UploadStudio disciplines={disciplines} />
    </div>
  );
}
