"use client";

import { CloudOff, Users } from "lucide-react";
import { formatClock, useCountdown, type Pressure } from "@/lib/traffic-client";

/**
 * A tarja que aparece no topo quando o acervo está cheio. Serve para a pessoa
 * saber que a lentidão é fila, não defeito, antes mesmo de clicar em nada.
 */
export function TrafficStrip({ pressure }: { pressure: Pressure }) {
  const restante = useCountdown(pressure.pauseSeconds);

  if (pressure.paused) {
    return (
      <Faixa tone="alerta">
        <CloudOff className="h-3 w-3" strokeWidth={1.6} />
        Armazenamento em pausa por excesso de acessos — volta em{" "}
        <span className="num tabular-nums">{formatClock(restante)}</span>. A leitura
        recomeça sozinha.
      </Faixa>
    );
  }

  if (pressure.budget >= 0.9) {
    return (
      <Faixa tone="alerta">
        <CloudOff className="h-3 w-3" strokeWidth={1.6} />
        A cota diária do acervo está no fim ({Math.round(pressure.budget * 100)}%). Downloads
        podem entrar em fila até a meia-noite (UTC).
      </Faixa>
    );
  }

  if (!pressure.busy) return null;

  return (
    <Faixa tone="calma">
      <Users className="h-3 w-3" strokeWidth={1.6} />
      Muita gente no acervo agora — {pressure.active} de {pressure.concurrent} transferências
      em curso{pressure.queue > 0 ? ` e ${pressure.queue} na fila` : ""}. Os downloads entram
      em fila e começam sozinhos.
    </Faixa>
  );
}

function Faixa({
  tone,
  children,
}: {
  tone: "calma" | "alerta";
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        tone === "alerta"
          ? "flex items-center justify-center gap-2 border-b border-amber-400/25 bg-amber-400/10 px-4 py-1.5 text-center text-[0.6875rem] leading-snug text-amber-100/90"
          : "flex items-center justify-center gap-2 border-b border-line bg-ink-2/70 px-4 py-1.5 text-center text-[0.6875rem] leading-snug text-muted"
      }
    >
      {children}
    </div>
  );
}
