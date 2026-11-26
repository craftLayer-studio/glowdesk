import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";
import { decodeSession, encodeSession } from "./session";

describe("session cookie", () => {
  const s = { userId: "u1", orgId: "o1", role: "owner" as const, name: "Rakesh" };
  it("round-trips a signed session", () => {
    expect(decodeSession(encodeSession(s))).toMatchObject(s);
  });
  it("rejects tampered or expired cookies", () => {
    const v = encodeSession(s);
    const [payload, mac] = v.split(".");
    const forged = Buffer.from(JSON.stringify({ ...s, role: "owner", orgId: "other", exp: Date.now() + 1e6 })).toString("base64url");
    expect(decodeSession(`${forged}.${mac}`)).toBeNull();
    expect(decodeSession(`${payload}.x${mac.slice(1)}`)).toBeNull();
    expect(decodeSession(encodeSession(s, 0))).toBeNull();
    expect(decodeSession(undefined)).toBeNull();
  });
});

describe("rate limit", () => {
  it("allows up to the limit per window", () => {
    const key = `t-${Math.random()}`;
    const results = Array.from({ length: 4 }, () => rateLimit(key, 3, 1000, 0));
    expect(results).toEqual([true, true, true, false]);
    expect(rateLimit(key, 3, 1000, 1001)).toBe(true);
  });
});
