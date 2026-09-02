"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { SlotPanel } from "@/components/traffic-panel";
import { useSlot } from "@/lib/traffic-client";
import { cx } from "@/lib/utils";

/** Dispara a transferência sem sair da página. */
function baixar(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
}

/**
 * Substitui o link direto para o arquivo. O clique pede uma vaga; se o acervo
 * estiver cheio, a pessoa entra na fila e o arquivo começa sozinho quando
 * chegar a vez — em vez de o navegador esbarrar no limite do armazenamento.
 */
export function DownloadButton({
  chave,
  rotulo,
  auto = false,
  className,
}: {
  chave: string;
  rotulo: string;
  auto?: boolean;
  className?: string;
}) {
  const [comecou, setComecou] = useState(false);
  const url = useRef<string | null>(null);

  const aoLiberar = useCallback((endereco: string) => {
    url.current = endereco;
    setComecou(true);
    baixar(endereco);
  }, []);

  const { decision, pedindo, pedir, desistir, relatarFalha } = useSlot({
    chave,
    auto,
    onLiberado: aoLiberar,
  });

  const esperando = pedindo || decision?.status === "fila";

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={pedir}
        disabled={esperando}
        className="btn btn-ghost w-full disabled:cursor-progress disabled:opacity-70"
      >
        {esperando ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
        ) : comecou ? (
          <Check className="h-3.5 w-3.5" strokeWidth={1.6} />
        ) : (
          <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
        )}
        {esperando ? "Na fila…" : comecou ? "Baixar de novo" : rotulo}
      </button>

      {comecou && decision?.status === "liberado" ? (
        <p className="text-[0.6875rem] leading-relaxed text-dim">
          O download começou.{" "}
          <button
            type="button"
            onClick={() => {
              relatarFalha();
              if (url.current) baixar(url.current);
            }}
            className="underline-grow text-muted hover:text-bone"
          >
            Não começou?
          </button>
        </p>
      ) : null}

      <SlotPanel decision={decision} pedindo={pedindo} onRetry={pedir} onCancel={desistir} />
    </div>
  );
}
