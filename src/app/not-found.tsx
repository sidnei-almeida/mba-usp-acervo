import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell flex min-h-[80svh] flex-col justify-center py-32">
      <p className="eyebrow">Erro 404</p>
      <h1 className="display mt-6 max-w-2xl text-[clamp(2.5rem,6vw,4.5rem)]">
        Esta página saiu de catálogo.
      </h1>
      <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
        O endereço não existe ou o título foi removido do acervo.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
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
