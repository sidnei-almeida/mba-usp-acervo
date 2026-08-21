import "server-only";
import { publicUrl, storage } from "@/lib/storage";
import { ADMIN_USERNAME, type User } from "@/lib/users";

/** The house itself: seeded records and the curator wear the glyph, not a photo. */
export const HOUSE_NAMES = new Set(["silo", "curadoria silo", ADMIN_USERNAME]);

export function isHouseAccount(name?: string, role?: string) {
  if (role === "admin") return true;
  return Boolean(name && HOUSE_NAMES.has(name.trim().toLowerCase()));
}

/**
 * Address the browser should hit for a portrait, resolved on the server so the
 * page ships a direct link. Signed links are anchored to the day to stay
 * cacheable, exactly like covers.
 */
export async function resolveAvatarUrl(key?: string): Promise<string | undefined> {
  if (!key) return undefined;

  const direct = publicUrl(key);
  if (direct) return direct;

  const signed = await storage().signedGetUrl(key, undefined, { stable: true });
  if (signed) return signed;

  return `/api/arquivo/${key}`;
}

export type Portrait = {
  name: string;
  url?: string;
  house: boolean;
};

export async function portraitOf(user: User): Promise<Portrait> {
  const house = isHouseAccount(user.username, user.role);
  return {
    name: user.name ?? user.username,
    url: house ? undefined : await resolveAvatarUrl(user.avatarKey),
    house,
  };
}
