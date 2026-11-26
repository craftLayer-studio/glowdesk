import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { appUrl } from "./config";
import { StoreError } from "./store/errors";

export const SESSION_COOKIE = "gd_session";
const MAX_AGE_S = 12 * 3600;

export interface Session {
  userId: string;
  orgId: string;
  role: "owner" | "staff";
  name: string;
  exp: number;
}

let warned = false;
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "false") throw new Error("SESSION_SECRET (32+ chars) is required in production");
  if (!warned) {
    console.warn("[glowdesk] SESSION_SECRET not set; using an insecure dev fallback. Set it in .env.local.");
    warned = true;
  }
  return "glowdesk-dev-only-insecure-session-secret";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeSession(s: Omit<Session, "exp">, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...s, exp: now + MAX_AGE_S * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value: string | undefined, now = Date.now()): Session | null {
  if (!value) return null;
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (typeof s.exp !== "number" || s.exp < now) return null;
    if (s.role !== "owner" && s.role !== "staff") return null;
    return s;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

/** Server-side role check for every staff/owner action. Owners can do everything staff can. */
export async function requireRole(role: "staff" | "owner"): Promise<Session> {
  const s = await getSession();
  if (!s) throw new StoreError("Sign in first", 401);
  if (role === "owner" && s.role !== "owner") throw new StoreError("Only the owner can do this", 403);
  return s;
}

export async function setSessionCookie(s: Omit<Session, "exp">) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(s), { httpOnly: true, sameSite: "lax", secure: appUrl().startsWith("https://"), path: "/", maxAge: MAX_AGE_S });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
