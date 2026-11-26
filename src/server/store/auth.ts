import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { checkOtp, makeOtp, OTP_TTL_MS } from "@/domain";
import type { DB } from "../db/client";
import { otpCodes, users } from "../db/schema";
import { messaging } from "../adapters/messaging";
import { requirePhone } from "./customers";
import { StoreError } from "./errors";
import { newId } from "./ids";

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

/**
 * Start sign-in. Always answers the same way so the phone list cannot be probed,
 * except that demo mode returns the code to show on screen.
 */
export async function requestOtp(db: DB, phoneInput: string, opts: { demo: boolean }, random = Math.random) {
  const phone = requirePhone(phoneInput);
  const [user] = await db.select().from(users).where(eq(users.phone, phone));
  if (!user) return { sent: true as const, demoCode: null };
  const code = makeOtp(random);
  await db.insert(otpCodes).values({ id: newId(), phone, codeHash: hash(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) });
  await messaging().send(db, { orgId: user.orgId, customerId: null, channel: "sms", purpose: "otp", template: "staff_otp", toPhone: phone, body: `GlowDesk sign-in code: ${code}. Valid 5 minutes. Do not share it.` });
  return { sent: true as const, demoCode: opts.demo ? code : null };
}

export async function verifyOtp(db: DB, phoneInput: string, code: string) {
  const phone = requirePhone(phoneInput);
  const [otp] = await db.select().from(otpCodes).where(eq(otpCodes.phone, phone)).orderBy(desc(otpCodes.createdAt)).limit(1);
  if (!otp) throw new StoreError("Request a code first", 401);
  const result = checkOtp({ expected: otp.codeHash, given: hash(code.trim()), expiresAt: otp.expiresAt.getTime(), attempts: otp.attempts, consumed: otp.consumed, now: Date.now() });
  if (result !== "ok") {
    await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
    const msg = { expired: "Code expired. Request a new one", too_many_attempts: "Too many tries. Request a new code", wrong_code: "Wrong code", used: "Code already used. Request a new one" }[result];
    throw new StoreError(msg, 401);
  }
  await db.update(otpCodes).set({ consumed: true }).where(and(eq(otpCodes.id, otp.id), eq(otpCodes.consumed, false)));
  const [user] = await db.select().from(users).where(eq(users.phone, phone));
  if (!user) throw new StoreError("No staff account for this number", 401);
  return { userId: user.id, orgId: user.orgId, role: user.role, name: user.name };
}
