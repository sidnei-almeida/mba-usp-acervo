import type { Metadata } from "next";
import { PasscodeGate } from "@/components/upload/passcode-gate";
import { UploadStudio } from "@/components/upload/upload-studio";
import { isContributor } from "@/lib/auth";
import { disciplinesOf, listBooks } from "@/lib/catalog";
import { isR2Configured } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enviar material",
  description: "Envie livros, apostilas e casos em PDF para o acervo do MBA USP/Esalq.",
};

export default async function UploadPage() {
  if (!(await isContributor())) {
    return (
      <div className="pt-[4.5rem]">
        <PasscodeGate />
      </div>
    );
  }

  const books = await listBooks();
  const disciplines = disciplinesOf(books).map((discipline) => discipline.name);

  return (
    <div className="pt-[4.5rem]">
      <section className="shell pb-8 pt-16 md:pt-24">
        <p className="eyebrow">Sala de envio</p>
        <h1 className="display mt-5 max-w-3xl text-[clamp(2.5rem,6vw,4.25rem)]">
          Coloque um novo título na estante.
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
          O arquivo vai para o Cloudflare R2 e a capa é gerada a partir da
          primeira página, aqui mesmo no navegador.
          {!isR2Configured() ? (
            <span className="mt-2 block text-[#d8b451]">
              Modo local: sem credenciais do R2, os arquivos ficam na pasta
              <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5">.data/</code>
              deste computador.
            </span>
          ) : null}
        </p>
      </section>

      <UploadStudio disciplines={disciplines} />
    </div>
  );
}
