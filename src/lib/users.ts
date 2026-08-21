import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { ensureSchema, isDatabaseConfigured, sql } from "@/lib/db/client";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const PREFIX = "usuarios/";

export type User = {
  id: string;
  username: string;
  name?: string;
  role: "admin" | "membro";
  createdAt: string;
  /** Stored WebP portrait; the glyph stands in when there is none. */
  avatarKey?: string;
};

type StoredUser = User & { passwordHash: string };

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function publicUser({
  id,
  username,
  name,
  role,
  createdAt,
  avatarKey,
}: StoredUser): User {
  return { id, username, name, role, createdAt, avatarKey };
}

function normalize(username: string) {
  return username.trim().toLowerCase();
}

// --- JSON fallback (no database configured) --------------------------------

async function jsonFind(username: string): Promise<StoredUser | null> {
  const raw = await storage().getText(`${PREFIX}${normalize(username)}.json`);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

async function jsonFindById(id: string): Promise<StoredUser | null> {
  const objects = await storage().list(PREFIX);
  for (const object of objects) {
    const raw = await storage().getText(object.key);
    if (!raw) continue;
    const user = JSON.parse(raw) as StoredUser;
    if (user.id === id) return user;
  }
  return null;
}

async function jsonCount() {
  return (await storage().list(PREFIX)).length;
}

async function jsonCreate(user: StoredUser) {
  await storage().put(
    `${PREFIX}${user.username}.json`,
    JSON.stringify(user, null, 2),
    "application/json",
  );
}

// --- Neon ------------------------------------------------------------------

type UserRow = {
  id: string;
  usuario: string;
  nome: string | null;
  senha_hash: string;
  papel: "admin" | "membro";
  criado_em: string;
  foto: string | null;
};

function fromRow(row: UserRow): StoredUser {
  return {
    id: row.id,
    username: row.usuario,
    name: row.nome ?? undefined,
    role: row.papel,
    createdAt: new Date(row.criado_em).toISOString(),
    passwordHash: row.senha_hash,
    avatarKey: row.foto ?? undefined,
  };
}

async function db() {
  await ensureSchema();
  return sql();
}

// --- Public API ------------------------------------------------------------

export async function findUserByUsername(username: string): Promise<StoredUser | null> {
  if (!isDatabaseConfigured()) return jsonFind(username);
  const run = await db();
  const rows = (await run`
    select * from usuarios where usuario = ${normalize(username)}
  `) as UserRow[];
  return rows.length ? fromRow(rows[0]) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (!isDatabaseConfigured()) {
    const user = await jsonFindById(id);
    return user ? publicUser(user) : null;
  }
  const run = await db();
  const rows = (await run`select * from usuarios where id = ${id}`) as UserRow[];
  return rows.length ? publicUser(fromRow(rows[0])) : null;
}

export async function countUsers() {
  if (!isDatabaseConfigured()) return jsonCount();
  const run = await db();
  const rows = (await run`select count(*)::int as total from usuarios`) as {
    total: number;
  }[];
  return rows[0]?.total ?? 0;
}

export async function createUser(input: {
  username: string;
  password: string;
  name?: string;
}): Promise<User> {
  const username = normalize(input.username);
  const passwordHash = await hashPassword(input.password);

  const user: StoredUser = {
    id: nanoid(12),
    username,
    name: input.name?.trim() || undefined,
    // Curation is never granted by signing up; see ensureAdminAccount.
    role: "membro",
    createdAt: new Date().toISOString(),
    passwordHash,
  };

  if (!isDatabaseConfigured()) {
    await jsonCreate(user);
    return publicUser(user);
  }

  const run = await db();
  await run`
    insert into usuarios (id, usuario, nome, senha_hash, papel, criado_em)
    values (${user.id}, ${user.username}, ${user.name ?? null}, ${passwordHash},
            ${user.role}, ${user.createdAt})
  `;
  return publicUser(user);
}

// --- The curator -----------------------------------------------------------

/** The one account that curates the shelf. Nobody else can register it. */
export const ADMIN_USERNAME = normalize(env.adminUsername);

let warnedAboutAdmin = false;

export function isReservedUsername(username: string) {
  return normalize(username) === ADMIN_USERNAME;
}

async function setRole(user: StoredUser, role: StoredUser["role"]) {
  if (!isDatabaseConfigured()) {
    await jsonCreate({ ...user, role });
    return;
  }
  const run = await db();
  await run`update usuarios set papel = ${role} where id = ${user.id}`;
}

/**
 * Makes sure the curator exists and still holds the role, creating it on first
 * run. Idempotent, and cheap enough to call on every sign-in attempt — which is
 * exactly when a fresh deployment needs it to have happened.
 */
export async function ensureAdminAccount(): Promise<void> {
  // No password configured means no curator: better an archive without an
  // administrator than one whose password is public.
  if (!env.adminPassword) {
    if (!warnedAboutAdmin) {
      warnedAboutAdmin = true;
      console.warn("[silo] ADMIN_PASSWORD não configurada — a conta de curadoria não será criada.");
    }
    return;
  }

  const existing = await findUserByUsername(ADMIN_USERNAME);

  if (existing) {
    // A role edited by hand in the database is put back where it belongs.
    if (existing.role !== "admin") await setRole(existing, "admin");
    return;
  }

  const user: StoredUser = {
    id: nanoid(12),
    username: ADMIN_USERNAME,
    name: "Curadoria Silo",
    role: "admin",
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword(env.adminPassword),
  };

  if (!isDatabaseConfigured()) {
    await jsonCreate(user);
    return;
  }

  const run = await db();
  await run`
    insert into usuarios (id, usuario, nome, senha_hash, papel, criado_em)
    values (${user.id}, ${user.username}, ${user.name ?? null}, ${user.passwordHash},
            ${user.role}, ${user.createdAt})
    on conflict (usuario) do nothing
  `;
}

export const AVATAR_PREFIX = "avatares/";

/** Where a member's portrait lives. One key per account, overwritten on change. */
export function avatarKeyFor(userId: string) {
  return `${AVATAR_PREFIX}${userId}.webp`;
}

export async function setAvatarKey(userId: string, key: string | null) {
  if (!isDatabaseConfigured()) {
    const user = await jsonFindById(userId);
    if (!user) return null;
    const next = { ...user, avatarKey: key ?? undefined };
    await jsonCreate(next);
    return publicUser(next);
  }

  const run = await db();
  const rows = (await run`
    update usuarios set foto = ${key} where id = ${userId} returning *
  `) as UserRow[];
  return rows.length ? publicUser(fromRow(rows[0])) : null;
}

/** Display names and portraits for a set of contributors, in one round trip. */
export async function findUsersByIds(ids: string[]): Promise<Map<string, User>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const found = new Map<string, User>();
  if (unique.length === 0) return found;

  if (!isDatabaseConfigured()) {
    for (const id of unique) {
      const user = await jsonFindById(id);
      if (user) found.set(id, publicUser(user));
    }
    return found;
  }

  const run = await db();
  const rows = (await run`select * from usuarios where id = any(${unique})`) as UserRow[];
  for (const row of rows) found.set(row.id, publicUser(fromRow(row)));
  return found;
}
