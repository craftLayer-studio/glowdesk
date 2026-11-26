/** Six-digit one-time code from a random source (injected for tests). */
export function makeOtp(random: () => number): string {
  return String(Math.floor(random() * 1_000_000)).padStart(6, "0");
}

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpCheck = "ok" | "expired" | "too_many_attempts" | "wrong_code" | "used";

export function checkOtp(input: { expected: string; given: string; expiresAt: number; attempts: number; consumed: boolean; now: number }): OtpCheck {
  if (input.consumed) return "used";
  if (input.now > input.expiresAt) return "expired";
  if (input.attempts >= OTP_MAX_ATTEMPTS) return "too_many_attempts";
  return input.expected === input.given ? "ok" : "wrong_code";
}
