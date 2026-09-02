import "server-only";
import { isDatabaseConfigured, sql } from "@/lib/db/client";

export type Lease = {
  id: string;
  key: string;
  client: string;
  bytes: number;
  reading: boolean;
};

export type Usage = { bytes: number; calls: number; downloads: number };

export type Pause = { until: string; reason: string } | null;

export type Ticket = Lease & { createdAt: number };

export interface TrafficStore {
  /** Drops leases and queue entries that timed out. Cheap, called on entry. */
  sweep(): Promise<void>;
  activeLeases(): Promise<number>;
  /** Takes a slot only if the site is under `max` — the check and the write
   *  are one statement so two visitors cannot both win the last slot. */
  openLease(lease: Lease, ttlSeconds: number, max: number): Promise<boolean>;
  closeLease(id: string): Promise<void>;
  hasLease(id: string, key: string): Promise<boolean>;
  enqueue(lease: Lease, ttlSeconds: number): Promise<void>;
  /** Keeps a queued ticket alive and reports how many are ahead of it. */
  keepQueued(id: string, ttlSeconds: number): Promise<number | null>;
  /** Moves a queued ticket into a slot when its turn came. */
  promote(id: string, ttlSeconds: number, max: number): Promise<boolean>;
  dequeue(id: string): Promise<void>;
  queueLength(): Promise<number>;
  usage(): Promise<Usage>;
  charge(bytes: number, downloads: number): Promise<void>;
  personToday(client: string): Promise<number>;
  chargePerson(client: string): Promise<void>;
  pause(reason: string, until: Date): Promise<void>;
  pausedUntil(): Promise<Pause>;
}

// --- Postgres -------------------------------------------------------------

let schema: Promise<void> | null = null;

function ensureTrafficSchema() {
  if (!schema) schema = bootstrapTraffic();
  return schema;
}

async function bootstrapTraffic() {
  const run = sql();
  await run`
    create table if not exists trafego_vagas (
      id text primary key,
      chave text not null,
      cliente text not null,
      bytes bigint not null default 0,
      leitura boolean not null default false,
      expira_em timestamptz not null
    )
  `;
  await run`create index if not exists trafego_vagas_expira_idx on trafego_vagas (expira_em)`;
  await run`
    create table if not exists trafego_fila (
      id text primary key,
      chave text not null,
      cliente text not null,
      bytes bigint not null default 0,
      leitura boolean not null default false,
      criado_em timestamptz not null default now(),
      expira_em timestamptz not null
    )
  `;
  await run`create index if not exists trafego_fila_ordem_idx on trafego_fila (criado_em)`;
  await run`
    create table if not exists trafego_uso (
      dia date primary key,
      bytes bigint not null default 0,
      chamadas integer not null default 0,
      downloads integer not null default 0
    )
  `;
  await run`
    create table if not exists trafego_pessoas (
      dia date not null,
      cliente text not null,
      downloads integer not null default 0,
      primary key (dia, cliente)
    )
  `;
  await run`
    create table if not exists trafego_pausa (
      id integer primary key,
      ate timestamptz not null,
      motivo text not null
    )
  `;
}

type Row = Record<string, unknown>;

function count(rows: Row[]) {
  return Number(rows[0]?.total ?? 0);
}

const postgresStore: TrafficStore = {
  async sweep() {
    await ensureTrafficSchema();
    const run = sql();
    await run`delete from trafego_vagas where expira_em < now()`;
    await run`delete from trafego_fila where expira_em < now()`;
  },

  async activeLeases() {
    await ensureTrafficSchema();
    return count((await sql()`select count(*)::int as total from trafego_vagas where expira_em > now()`) as Row[]);
  },

  async openLease(lease, ttlSeconds, max) {
    await ensureTrafficSchema();
    const rows = (await sql()`
      insert into trafego_vagas (id, chave, cliente, bytes, leitura, expira_em)
      select ${lease.id}::text, ${lease.key}::text, ${lease.client}::text,
             ${Math.round(lease.bytes)}::bigint, ${lease.reading}::boolean,
             now() + make_interval(secs => ${ttlSeconds}::int)
      where (select count(*) from trafego_vagas where expira_em > now()) < ${max}
      returning id
    `) as Row[];
    return rows.length > 0;
  },

  async closeLease(id) {
    await ensureTrafficSchema();
    await sql()`delete from trafego_vagas where id = ${id}`;
  },

  async hasLease(id, key) {
    await ensureTrafficSchema();
    const rows = (await sql()`
      select 1 from trafego_vagas
      where id = ${id} and chave = ${key} and expira_em > now()
    `) as Row[];
    return rows.length > 0;
  },

  async enqueue(lease, ttlSeconds) {
    await ensureTrafficSchema();
    await sql()`
      insert into trafego_fila (id, chave, cliente, bytes, leitura, expira_em)
      values (${lease.id}, ${lease.key}, ${lease.client}, ${Math.round(lease.bytes)},
              ${lease.reading}, now() + make_interval(secs => ${ttlSeconds}::int))
      on conflict (id) do update set expira_em = excluded.expira_em
    `;
  },

  async keepQueued(id, ttlSeconds) {
    await ensureTrafficSchema();
    const run = sql();
    const alive = (await run`
      update trafego_fila
      set expira_em = now() + make_interval(secs => ${ttlSeconds}::int)
      where id = ${id} and expira_em > now()
      returning criado_em
    `) as Row[];
    if (alive.length === 0) return null;
    return count((await run`
      select count(*)::int as total from trafego_fila
      where expira_em > now() and criado_em < ${alive[0].criado_em as string}
    `) as Row[]);
  },

  async promote(id, ttlSeconds, max) {
    await ensureTrafficSchema();
    const run = sql();
    // Its turn came when everyone already served plus everyone ahead of it in
    // the queue still fits under the ceiling.
    const rows = (await run`
      insert into trafego_vagas (id, chave, cliente, bytes, leitura, expira_em)
      select f.id, f.chave, f.cliente, f.bytes, f.leitura,
             now() + make_interval(secs => ${ttlSeconds}::int)
      from trafego_fila f
      where f.id = ${id}
        and f.expira_em > now()
        and (select count(*) from trafego_vagas where expira_em > now())
          + (select count(*) from trafego_fila anteriores
             where anteriores.expira_em > now() and anteriores.criado_em < f.criado_em) < ${max}
      returning id
    `) as Row[];
    if (rows.length === 0) return false;
    await run`delete from trafego_fila where id = ${id}`;
    return true;
  },

  async dequeue(id) {
    await ensureTrafficSchema();
    await sql()`delete from trafego_fila where id = ${id}`;
  },

  async queueLength() {
    await ensureTrafficSchema();
    return count((await sql()`select count(*)::int as total from trafego_fila where expira_em > now()`) as Row[]);
  },

  async usage() {
    await ensureTrafficSchema();
    const rows = (await sql()`
      select bytes, chamadas, downloads from trafego_uso where dia = current_date
    `) as Row[];
    const row = rows[0];
    return {
      bytes: Number(row?.bytes ?? 0),
      calls: Number(row?.chamadas ?? 0),
      downloads: Number(row?.downloads ?? 0),
    };
  },

  async charge(bytes, downloads) {
    await ensureTrafficSchema();
    await sql()`
      insert into trafego_uso (dia, bytes, chamadas, downloads)
      values (current_date, ${Math.round(bytes)}, 1, ${downloads})
      on conflict (dia) do update set
        bytes = trafego_uso.bytes + excluded.bytes,
        chamadas = trafego_uso.chamadas + excluded.chamadas,
        downloads = trafego_uso.downloads + excluded.downloads
    `;
  },

  async personToday(client) {
    await ensureTrafficSchema();
    const rows = (await sql()`
      select downloads from trafego_pessoas where dia = current_date and cliente = ${client}
    `) as Row[];
    return Number(rows[0]?.downloads ?? 0);
  },

  async chargePerson(client) {
    await ensureTrafficSchema();
    await sql()`
      insert into trafego_pessoas (dia, cliente, downloads)
      values (current_date, ${client}, 1)
      on conflict (dia, cliente) do update set downloads = trafego_pessoas.downloads + 1
    `;
  },

  async pause(reason, until) {
    await ensureTrafficSchema();
    await sql()`
      insert into trafego_pausa (id, ate, motivo)
      values (1, ${until.toISOString()}, ${reason})
      on conflict (id) do update set
        ate = greatest(trafego_pausa.ate, excluded.ate),
        motivo = excluded.motivo
    `;
  },

  async pausedUntil() {
    await ensureTrafficSchema();
    const rows = (await sql()`select ate, motivo from trafego_pausa where id = 1 and ate > now()`) as Row[];
    const row = rows[0];
    if (!row) return null;
    return { until: new Date(row.ate as string).toISOString(), reason: String(row.motivo) };
  },
};

// --- In memory ------------------------------------------------------------

/**
 * Fallback for a shelf running without Postgres. It only governs the instance
 * it lives in, which is exactly right for `next dev` and wrong for a fleet of
 * serverless functions — in production the database above is what holds the
 * line.
 */
type MemoryEntry = Lease & { createdAt: number; expiresAt: number };

const memory = {
  leases: new Map<string, MemoryEntry>(),
  queue: new Map<string, MemoryEntry>(),
  day: "",
  usage: { bytes: 0, calls: 0, downloads: 0 } as Usage,
  people: new Map<string, number>(),
  pause: null as Pause,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function rollDay() {
  const day = today();
  if (memory.day === day) return;
  memory.day = day;
  memory.usage = { bytes: 0, calls: 0, downloads: 0 };
  memory.people.clear();
}

function ahead(entry: MemoryEntry) {
  let total = 0;
  for (const other of memory.queue.values()) {
    if (other.id !== entry.id && other.createdAt < entry.createdAt) total += 1;
  }
  return total;
}

const memoryStore: TrafficStore = {
  async sweep() {
    const now = Date.now();
    for (const [id, entry] of memory.leases) if (entry.expiresAt < now) memory.leases.delete(id);
    for (const [id, entry] of memory.queue) if (entry.expiresAt < now) memory.queue.delete(id);
    rollDay();
  },

  async activeLeases() {
    return memory.leases.size;
  },

  async openLease(lease, ttlSeconds, max) {
    if (memory.leases.size >= max) return false;
    memory.leases.set(lease.id, {
      ...lease,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return true;
  },

  async closeLease(id) {
    memory.leases.delete(id);
  },

  async hasLease(id, key) {
    const lease = memory.leases.get(id);
    return Boolean(lease && lease.key === key && lease.expiresAt > Date.now());
  },

  async enqueue(lease, ttlSeconds) {
    const existing = memory.queue.get(lease.id);
    memory.queue.set(lease.id, {
      ...lease,
      createdAt: existing?.createdAt ?? Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  async keepQueued(id, ttlSeconds) {
    const entry = memory.queue.get(id);
    if (!entry) return null;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return ahead(entry);
  },

  async promote(id, ttlSeconds, max) {
    const entry = memory.queue.get(id);
    if (!entry) return false;
    if (memory.leases.size + ahead(entry) >= max) return false;
    memory.queue.delete(id);
    memory.leases.set(id, { ...entry, expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  },

  async dequeue(id) {
    memory.queue.delete(id);
  },

  async queueLength() {
    return memory.queue.size;
  },

  async usage() {
    rollDay();
    return { ...memory.usage };
  },

  async charge(bytes, downloads) {
    rollDay();
    memory.usage.bytes += Math.round(bytes);
    memory.usage.calls += 1;
    memory.usage.downloads += downloads;
  },

  async personToday(client) {
    rollDay();
    return memory.people.get(client) ?? 0;
  },

  async chargePerson(client) {
    rollDay();
    memory.people.set(client, (memory.people.get(client) ?? 0) + 1);
  },

  async pause(reason, until) {
    const current = memory.pause ? Date.parse(memory.pause.until) : 0;
    if (until.getTime() > current) {
      memory.pause = { until: until.toISOString(), reason };
    }
  },

  async pausedUntil() {
    if (!memory.pause) return null;
    if (Date.parse(memory.pause.until) <= Date.now()) {
      memory.pause = null;
      return null;
    }
    return memory.pause;
  },
};

export function trafficStore(): TrafficStore {
  return isDatabaseConfigured() ? postgresStore : memoryStore;
}
