import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell flex min-h-[80svh] flex-col justify-center py-32">
      <span className="label">Erro 404</span>
      <h1 className="display mt-4 max-w-2xl text-[clamp(1.75rem,4vw,3rem)]">
        Esta página saiu de catálogo.
      </h1>
      <p className="prose-sm mt-4 max-w-md">
        O endereço não existe ou o título foi removido do acervo.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/" className="btn btn-solid">
          Voltar ao início
        </Link>
        <Link href="/acervo" className="btn btn-ghost">
          Ver o acervo
        </Link>
      </div>
    </div>
  );
}
