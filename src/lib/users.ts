import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { ensureSchema, isDatabaseConfigured, sql } from "@/lib/db/client";
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

export function publicUser({ id, username, name, role, createdAt }: StoredUser): User {
  return { id, username, name, role, createdAt };
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
};

function fromRow(row: UserRow): StoredUser {
  return {
    id: row.id,
    username: row.usuario,
    name: row.nome ?? undefined,
    role: row.papel,
    createdAt: new Date(row.criado_em).toISOString(),
    passwordHash: row.senha_hash,
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
  // The first account to register administers the shelf.
  const role = (await countUsers()) === 0 ? "admin" : "membro";

  const user: StoredUser = {
    id: nanoid(12),
    username,
    name: input.name?.trim() || undefined,
    role,
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
