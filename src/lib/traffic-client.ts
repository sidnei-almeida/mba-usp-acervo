"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Pressure = {
  active: number;
  queue: number;
  concurrent: number;
  budget: number;
  busy: boolean;
  paused?: { until: string; reason: string };
  pauseSeconds?: number;
};

export type SlotStatus =
  | "liberado"
  | "fila"
  | "pausa"
  | "cota"
  | "pessoal"
  | "expirado"
  | "erro";

export type Decision = {
  status: SlotStatus;
  ticket?: string;
  url?: string;
  position?: number;
  waitSeconds?: number;
  retryAfter?: number;
  holdSeconds?: number;
  message?: string;
  pressure?: Pressure;
};

/** How often a queued page asks whether its turn came. */
const POLL_MS = 4000;

const OFFLINE: Decision = {
  status: "erro",
  message: "Não foi possível falar com o acervo. Verifique a conexão e tente de novo.",
};

async function ask(body: Record<string, unknown>): Promise<Decision> {
  try {
    const response = await fetch("/api/fila", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as Decision | null;
    if (!data) return OFFLINE;
    if (!data.status) {
      return { status: "erro", message: (data as { error?: string }).error ?? OFFLINE.message };
    }
    return data;
  } catch {
    return OFFLINE;
  }
}

/**
 * Holds one place in line for one file. The page asks, waits while the shelf
 * is busy, and is told the moment a slot opens — nothing here talks to the
 * bucket, so a full queue never turns into a broken download.
 */
export function useSlot({
  chave,
  leitura = false,
  auto = false,
  onLiberado,
}: {
  chave: string;
  leitura?: boolean;
  auto?: boolean;
  onLiberado?: (url: string) => void;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [pedindo, setPedindo] = useState(auto);
  const ticket = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vivo = useRef(true);
  const granted = useRef(onLiberado);
  // A próxima rodada é chamada por um relógio, então precisa de uma referência
  // sempre atual — sem isso o `setTimeout` chamaria a versão antiga.
  const proxima = useRef<() => void>(() => {});

  useEffect(() => {
    granted.current = onLiberado;
  });

  const parar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const rodada = useCallback(async () => {
    const answer = await ask({
      chave,
      leitura,
      senha: ticket.current ?? undefined,
      acao: "pedir",
    });
    if (!vivo.current) return;

    if (answer.ticket) ticket.current = answer.ticket;
    setDecision(answer);
    setPedindo(false);

    if (answer.status === "fila") {
      timer.current = setTimeout(() => proxima.current(), POLL_MS);
      return;
    }
    if (answer.status === "liberado" && answer.url) {
      granted.current?.(answer.url);
    }
  }, [chave, leitura]);

  useEffect(() => {
    proxima.current = () => void rodada();
  }, [rodada]);

  const pedir = useCallback(() => {
    parar();
    setPedindo(true);
    void rodada();
  }, [parar, rodada]);

  const desistir = useCallback(() => {
    parar();
    const senha = ticket.current;
    ticket.current = null;
    setDecision(null);
    setPedindo(false);
    if (senha) void ask({ chave, senha, acao: "liberar" });
  }, [chave, parar]);

  /** Conta ao acervo que uma transferência falhou, para os outros não caírem
   *  no mesmo buraco. */
  const relatarFalha = useCallback(
    (codigo?: number) => {
      void ask({ chave, acao: "falha", codigo });
    },
    [chave],
  );

  useEffect(() => {
    vivo.current = true;
    if (auto) void rodada();
    return () => {
      vivo.current = false;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      // Sair da página no meio da fila devolve o lugar para a próxima pessoa.
      const senha = ticket.current;
      if (senha && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/fila",
          new Blob([JSON.stringify({ chave, senha, acao: "liberar" })], {
            type: "application/json",
          }),
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return { decision, pedindo, pedir, desistir, relatarFalha };
}

/** Conta um punhado de segundos até zero, um por segundo. */
export function useCountdown(seconds?: number) {
  const [alvo, setAlvo] = useState(seconds);
  const [left, setLeft] = useState(seconds ?? 0);

  // Recomeça a contagem quando o servidor manda um prazo novo.
  if (alvo !== seconds) {
    setAlvo(seconds);
    setLeft(seconds ?? 0);
  }

  useEffect(() => {
    if (!seconds) return;
    const id = setInterval(() => {
      setLeft((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  return left;
}

export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  if (safe >= 3600) {
    const hours = Math.floor(safe / 3600);
    const minutes = Math.round((safe % 3600) / 60);
    return `${hours}h${String(minutes).padStart(2, "0")}`;
  }
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
