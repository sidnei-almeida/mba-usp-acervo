const MB = 1024 * 1024;

function amount(name: string, fallback: number) {
  const raw = process.env[name];
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * The shelf sits on a Backblaze B2 free bucket: 1 GB of egress and 2500 class B
 * transactions per day. Past either line B2 answers with an error instead of
 * the file, so the app has to stop before B2 does — these are the numbers it
 * stops at. Every one of them can be raised from the environment once the
 * bucket is paid for.
 */
export const limits = {
  /** Files handed out at the same time, across everyone on the site. */
  concurrent: amount("TRAFEGO_SIMULTANEOS", 3),
  /** Daily egress budget, kept under 1 GB so covers still have room. */
  dailyBytes: amount("TRAFEGO_ORCAMENTO_MB", 820) * MB,
  /** Daily class B transactions, kept under 2500. */
  dailyCalls: amount("TRAFEGO_TRANSACOES", 2100),
  /** Files one person may take in a day. */
  perPerson: amount("TRAFEGO_POR_PESSOA", 12),
  /** How long a handed-out slot stays held. */
  leaseSeconds: amount("TRAFEGO_VAGA_SEGUNDOS", 150),
  /** Reading holds a slot longer — the reader fetches while the page is open. */
  readLeaseSeconds: amount("TRAFEGO_LEITURA_SEGUNDOS", 600),
  /** A queued ticket that stops polling is dropped after this. */
  queueTtlSeconds: amount("TRAFEGO_FILA_SEGUNDOS", 90),
  /** Cooldown after Backblaze itself refuses a read. */
  cooldownMinutes: amount("TRAFEGO_PAUSA_MINUTOS", 5),
  /**
   * The reader fetches ranges instead of the whole file, so charging a reading
   * slot the full size would empty the budget for pages nobody opened.
   */
  readShare: amount("TRAFEGO_FRACAO_LEITURA", 0.5),
};

/** The B2 counters reset at midnight UTC; so does the budget. */
export function secondsToReset(now = new Date()) {
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}
