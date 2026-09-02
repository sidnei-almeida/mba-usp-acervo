import "server-only";
import { createHmac } from "node:crypto";
import { nanoid } from "nanoid";
import { env } from "@/lib/env";
import { limits, secondsToReset } from "./limits";
import { trafficStore } from "./store";

export type Pressure = {
  /** Slots in use right now. */
  active: number;
  /** People waiting behind them. */
  queue: number;
  concurrent: number;
  /** Share of the daily budget already spent, 0 to 1. */
  budget: number;
  /** True once the shelf is handing out every slot it has. */
  busy: boolean;
  /** Set while the bucket itself asked for quiet. */
  paused?: { until: string; reason: string };
  /** Seconds left of that pause, counted on the server so the page does not
   *  depend on the reader's clock. */
  pauseSeconds?: number;
};

export type Decision =
  | { status: "liberado"; ticket: string; url: string; holdSeconds: number; pressure: Pressure }
  | {
      status: "fila";
      ticket: string;
      position: number;
      waitSeconds: number;
      pressure: Pressure;
      message: string;
    }
  | { status: "pausa"; retryAfter: number; message: string; pressure: Pressure }
  | { status: "cota"; retryAfter: number; message: string; pressure: Pressure }
  | { status: "pessoal"; retryAfter: number; message: string; pressure: Pressure }
  | { status: "expirado"; message: string; pressure: Pressure };

export type SlotRequest = {
  key: string;
  bytes: number;
  reading: boolean;
  client: string;
  /** Present when the caller is already holding a place in line. */
  ticket?: string;
};

/**
 * Who is asking, without keeping an address around: the signing secret turns
 * the IP and browser into an opaque handle that only survives the day's
 * counters. A signed-in reader is counted by account instead, so a household
 * behind one address is not treated as one person.
 */
export function clientKey(request: Request, userId?: string) {
  if (userId) return `u:${userId}`;
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const agent = request.headers.get("user-agent") ?? "";
  return createHmac("sha256", env.sessionSecret).update(`${ip}|${agent}`).digest("hex").slice(0, 24);
}

function fileUrl(key: string, ticket: string, reading: boolean) {
  const query = reading ? `t=${ticket}` : `download&t=${ticket}`;
  return `/api/arquivo/${key}?${query}`;
}

async function readPressure(): Promise<Pressure> {
  const store = trafficStore();
  const [active, queue, usage, paused] = await Promise.all([
    store.activeLeases(),
    store.queueLength(),
    store.usage(),
    store.pausedUntil(),
  ]);
  return {
    active,
    queue,
    concurrent: limits.concurrent,
    budget: Math.min(1, usage.bytes / limits.dailyBytes),
    busy: active >= limits.concurrent || queue > 0,
    paused: paused ?? undefined,
    pauseSeconds: paused
      ? Math.max(1, Math.round((Date.parse(paused.until) - Date.now()) / 1000))
      : undefined,
  };
}

let snapshot: { at: number; value: Pressure } | null = null;

/**
 * Same reading, but at most once every few seconds per instance. The site
 * header asks for it on every page, and the answer does not need to be newer
 * than the time it takes to read a paragraph.
 */
export async function pressureSnapshot(ttlMs = 15_000): Promise<Pressure> {
  if (snapshot && Date.now() - snapshot.at < ttlMs) return snapshot.value;
  const value = await readPressure();
  snapshot = { at: Date.now(), value };
  return value;
}

/** Slots are held for a fixed time because the file goes straight from the
 *  bucket to the browser — nobody reports back when it lands. The hold is what
 *  spaces the transfers out. */
function holdFor(reading: boolean) {
  return reading ? limits.readLeaseSeconds : limits.leaseSeconds;
}

function charged(bytes: number, reading: boolean) {
  return reading ? bytes * limits.readShare : bytes;
}

function waitEstimate(position: number, reading: boolean) {
  const rounds = Math.floor(position / Math.max(1, limits.concurrent)) + 1;
  return rounds * holdFor(reading);
}

/**
 * The single door to the bucket. Everything that would make Backblaze answer
 * with an error — too many transfers at once, the daily gigabyte spent, one
 * person taking the whole shelf — is decided here, before a byte moves.
 */
export async function requestSlot(input: SlotRequest): Promise<Decision> {
  const store = trafficStore();
  await store.sweep();

  const paused = await store.pausedUntil();
  if (paused) {
    return {
      status: "pausa",
      retryAfter: Math.max(1, Math.ceil((Date.parse(paused.until) - Date.now()) / 1000)),
      message:
        "O armazenamento pediu uma pausa por excesso de acessos. Estamos esperando ele voltar.",
      pressure: await readPressure(),
    };
  }

  const cost = charged(input.bytes, input.reading);
  const usage = await store.usage();
  if (usage.bytes + cost > limits.dailyBytes || usage.calls >= limits.dailyCalls) {
    return {
      status: "cota",
      retryAfter: secondsToReset(),
      message:
        "A cota de hoje do acervo acabou. Ela é renovada à meia-noite (UTC) e a leitura volta sozinha.",
      pressure: await readPressure(),
    };
  }

  if (!input.reading && (await store.personToday(input.client)) >= limits.perPerson) {
    return {
      status: "pessoal",
      retryAfter: secondsToReset(),
      message: `Você já baixou ${limits.perPerson} arquivos hoje. O limite existe para o acervo caber no dia de todo mundo.`,
      pressure: await readPressure(),
    };
  }

  // Already in line: keep the place, and take a slot the moment one opens.
  if (input.ticket) {
    const promoted = await store.promote(input.ticket, holdFor(input.reading), limits.concurrent);
    if (promoted) return grant(input, input.ticket, cost);

    const position = await store.keepQueued(input.ticket, limits.queueTtlSeconds);
    if (position === null) {
      return {
        status: "expirado",
        message: "Sua vez passou enquanto a página estava parada. Peça o arquivo de novo.",
        pressure: await readPressure(),
      };
    }
    return queued(input, input.ticket, position);
  }

  const ticket = nanoid(12);
  const lease = {
    id: ticket,
    key: input.key,
    client: input.client,
    bytes: cost,
    reading: input.reading,
  };

  if (await store.openLease(lease, holdFor(input.reading), limits.concurrent)) {
    return grant(input, ticket, cost);
  }

  await store.enqueue(lease, limits.queueTtlSeconds);
  const position = (await store.keepQueued(ticket, limits.queueTtlSeconds)) ?? 0;
  return queued(input, ticket, position);
}

async function grant(input: SlotRequest, ticket: string, cost: number): Promise<Decision> {
  const store = trafficStore();
  await store.charge(cost, input.reading ? 0 : 1);
  if (!input.reading) await store.chargePerson(input.client);
  return {
    status: "liberado",
    ticket,
    url: fileUrl(input.key, ticket, input.reading),
    holdSeconds: holdFor(input.reading),
    pressure: await readPressure(),
  };
}

async function queued(input: SlotRequest, ticket: string, position: number): Promise<Decision> {
  const pressure = await readPressure();
  return {
    status: "fila",
    ticket,
    position,
    waitSeconds: waitEstimate(position, input.reading),
    pressure,
    message:
      position === 0
        ? "Você é o próximo. Assim que uma transferência terminar, o arquivo começa sozinho."
        : `${position} ${position === 1 ? "pessoa" : "pessoas"} na sua frente. O arquivo começa sozinho quando chegar a sua vez.`,
  };
}

/** Frees the slot as soon as the browser says it is done with it. */
export async function releaseSlot(ticket: string) {
  const store = trafficStore();
  await store.closeLease(ticket);
  await store.dequeue(ticket);
}

/** True when this ticket really was handed a slot for this file. */
export async function holdsSlot(ticket: string | null, key: string) {
  if (!ticket) return false;
  return trafficStore().hasLease(ticket, key);
}

export async function pressure() {
  await trafficStore().sweep();
  return readPressure();
}

/**
 * Backblaze answering with a cap or a slow-down is the last warning before the
 * bucket goes dark. When it happens the whole site steps back for a few
 * minutes instead of hammering the door.
 */
export async function noteStorageFailure(error: unknown) {
  const text = describe(error).toLowerCase();
  const capped =
    text.includes("cap exceeded") ||
    text.includes("download_cap_exceeded") ||
    text.includes("storage_cap_exceeded") ||
    text.includes("transaction_cap_exceeded");
  const throttled =
    text.includes("slowdown") ||
    text.includes("slow down") ||
    text.includes("service unavailable") ||
    text.includes("503");

  if (!capped && !throttled) return null;

  const until = capped
    ? new Date(Date.now() + secondsToReset() * 1000)
    : new Date(Date.now() + limits.cooldownMinutes * 60_000);
  const reason = capped ? "cota do armazenamento" : "armazenamento pediu calma";
  await trafficStore().pause(reason, until);
  return { until: until.toISOString(), reason };
}

function describe(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name} ${error.message}`;
  return JSON.stringify(error);
}

/** Counts a read that did not go through the queue — a cover, a portrait. */
export async function noteRead(bytes: number) {
  await trafficStore().charge(bytes, 0);
}

export type Blocked = {
  status: "pausa" | "cota";
  message: string;
  retryAfter: number;
};

/**
 * Whether the bucket is off limits right now, for anything that is not worth
 * queueing. Keeps a cover from turning into a raw Backblaze error page.
 */
export async function storageBlocked(): Promise<Blocked | null> {
  const store = trafficStore();
  const paused = await store.pausedUntil();
  if (paused) {
    return {
      status: "pausa",
      message: "O armazenamento pediu uma pausa. Volta em alguns minutos.",
      retryAfter: Math.max(1, Math.ceil((Date.parse(paused.until) - Date.now()) / 1000)),
    };
  }

  const usage = await store.usage();
  if (usage.bytes >= limits.dailyBytes || usage.calls >= limits.dailyCalls) {
    return {
      status: "cota",
      message: "A cota diária do acervo acabou. Ela é renovada à meia-noite (UTC).",
      retryAfter: secondsToReset(),
    };
  }

  return null;
}
