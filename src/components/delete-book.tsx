"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteBook({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const remove = async () => {
    if (!window.confirm(`Remover "${title}" do acervo? O PDF também será apagado.`)) return;
    setPending(true);
    const response = await fetch(`/api/livros/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setPending(false);
      window.alert("Não foi possível remover este título.");
      return;
    }
    router.push("/acervo");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="link-underline inline-flex items-center gap-2 self-start text-[0.6875rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-[#e5866f] disabled:opacity-40"
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      {pending ? "Removendo…" : "Remover do acervo"}
    </button>
  );
}
