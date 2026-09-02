"use client";

import { useEffect } from "react";
import { Clock, Loader2, TriangleAlert, Users } from "lucide-react";
import { formatClock, useCountdown, type Decision } from "@/lib/traffic-client";
import { cx } from "@/lib/utils";

const TITULO: Record<string, string> = {
  fila: "Você está na fila",
  pausa: "Acervo respirando",
  cota: "Cota de hoje esgotada",
  pessoal: "Limite diário atingido",
  expirado: "Sua vez passou",
  erro: "Não deu para trazer o arquivo",
};

/**
 * O que o leitor vê quando o acervo está cheio. A regra é sempre dizer três
 * coisas: o que aconteceu, quanto falta e o que fazer — nunca deixar um erro
 * cru do armazenamento chegar à tela.
 */
export function SlotPanel({
  decision,
  pedindo,
  onRetry,
  onCancel,
  className,
}: {
  decision: Decision | null;
  pedindo?: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const espera =
    decision?.status === "fila" ? decision.waitSeconds : decision?.retryAfter;
  const restante = useCountdown(espera);
  const acabou = Boolean(espera) && restante === 0;

  // Pausa e cota se resolvem sozinhas com o tempo — quando o relógio zera, a
  // página tenta de novo em vez de exigir um clique.
  useEffect(() => {
    if (!acabou || !onRetry) return;
    if (decision?.status === "pausa" || decision?.status === "cota") onRetry();
  }, [acabou, decision?.status, onRetry]);

  if (!decision && !pedindo) return null;

  if (pedindo && !decision) {
    return (
      <div className={cx("flex items-center gap-2 text-[0.75rem] text-muted", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
        Procurando uma vaga…
      </div>
    );
  }

  if (!decision || decision.status === "liberado") return null;

  const fila = decision.status === "fila";
  const pressure = decision.pressure;

  return (
    <div
      className={cx(
        "border border-line bg-ink-2/60 p-4 text-left",
        fila ? "border-white/25" : "border-amber-400/35",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        {fila ? (
          <Users className="h-3.5 w-3.5 text-bone" strokeWidth={1.6} />
        ) : (
          <TriangleAlert className="h-3.5 w-3.5 text-amber-300" strokeWidth={1.6} />
        )}
        <span className="label text-bone">{TITULO[decision.status] ?? "Aguarde"}</span>
      </div>

      {fila && typeof decision.position === "number" ? (
        <p className="mt-3 flex items-baseline gap-2">
          <span className="num display text-3xl">{decision.position + 1}º</span>
          <span className="text-[0.75rem] text-muted">na fila</span>
        </p>
      ) : null}

      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">{decision.message}</p>

      {espera ? (
        <div className="mt-3 flex items-center gap-2 text-[0.75rem] text-dim">
          <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="num tabular-nums text-bone">{formatClock(restante)}</span>
          <span>{fila ? "de espera estimada" : "para tentar de novo"}</span>
        </div>
      ) : null}

      {pressure ? (
        <p className="mt-3 border-t border-line pt-3 text-[0.6875rem] uppercase tracking-[0.16em] text-dim">
          {pressure.active}/{pressure.concurrent} transferências ·{" "}
          {pressure.queue} na fila · {Math.round(pressure.budget * 100)}% da cota do dia
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {onRetry && !fila ? (
          <button type="button" onClick={onRetry} className="btn btn-ghost h-8 px-3 text-[0.625rem]">
            Tentar de novo
          </button>
        ) : null}
        {onCancel && fila ? (
          <button type="button" onClick={onCancel} className="btn btn-ghost h-8 px-3 text-[0.625rem]">
            Sair da fila
          </button>
        ) : null}
      </div>
    </div>
  );
}
