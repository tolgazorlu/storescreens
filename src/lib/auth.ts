import "server-only";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, users, apiKeys, type User } from "@/lib/db";

const COOKIE = "screeny_session";
const SECRET = () => process.env.SESSION_SECRET ?? "insecure-dev-secret";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

function sign(payload: string) {
  return createHmac("sha256", SECRET()).update(payload).digest("base64url");
}

export function makeSessionToken(userId: string, days = 30) {
  const exp = Date.now() + days * 86_400_000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token?: string | null): string | null {
  if (!token) return null;
  const [userId, exp, sig] = token.split(".");
  if (!userId || !exp || !sig) return null;
  const expected = sign(`${userId}.${exp}`);
  if (
    expected.length !== sig.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  )
    return null;
  if (Number(exp) < Date.now()) return null;
  return userId;
}

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(COOKIE, makeSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 86_400,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const userId = parseSessionToken(store.get(COOKIE)?.value);
  if (!userId) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

// ---- API keys ----

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  const raw = `sk_${randomBytes(24).toString("base64url")}`;
  return { raw, prefix: raw.slice(0, 10), hash: hashApiKey(raw) };
}

export async function getUserByApiKey(raw: string): Promise<User | null> {
  const [row] = await db
    .select({ user: users, keyId: apiKeys.id })
    .from(apiKeys)
    .innerJoin(users, eq(users.id, apiKeys.userId))
    .where(eq(apiKeys.keyHash, hashApiKey(raw)))
    .limit(1);
  if (!row) return null;
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.keyId))
    .execute()
    .catch(() => {});
  return row.user;
}

/** Resolve the user for a request: Bearer API key first, then session cookie. */
export async function getRequestUser(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return getUserByApiKey(auth.slice(7).trim());
  }
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) return getUserByApiKey(apiKey);
  return getSessionUser();
}
