import { describe, expect, it } from "vitest";
import { averageRating, routeReview } from "./review";
import { currentConsent } from "./consent";
import { chairUtilisation, repeatRate, revenueByStylist, type VisitFact } from "./dashboard";
import { checkOtp, makeOtp } from "./otp";
import { upiLink } from "./upi";

describe("review funnel", () => {
  it("sends happy clients to Google and keeps unhappy feedback private", () => {
    expect(routeReview(5)).toBe("google");
    expect(routeReview(4)).toBe("google");
    expect(routeReview(3)).toBe("private");
    expect(() => routeReview(6)).toThrow();
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([])).toBeNull();
  });
});

describe("consent", () => {
  it("uses the latest event per purpose and defaults to no consent", () => {
    expect(currentConsent([])).toEqual({ service_updates: false, marketing: false });
    expect(
      currentConsent([
        { purpose: "marketing", granted: true, at: 1 },
        { purpose: "marketing", granted: false, at: 2 },
        { purpose: "service_updates", granted: true, at: 1 },
      ]),
    ).toEqual({ service_updates: true, marketing: false });
  });
});

describe("dashboard metrics", () => {
  const v = (customerId: string, stylistId: string, total: number, at: number): VisitFact => ({ customerId, stylistId, total, taxable: total, commission: total / 10, serviceMinutes: 30, at });
  it("computes chair utilisation", () => {
    expect(chairUtilisation(300, 2, 600, 1)).toBe(0.25);
    expect(chairUtilisation(10, 0, 600, 1)).toBe(0);
  });
  it("ranks stylists by revenue", () => {
    const rows = revenueByStylist([v("a", "s1", 100, 1), v("b", "s2", 300, 1), v("c", "s1", 100, 1)]);
    expect(rows[0]).toEqual({ stylistId: "s2", visits: 1, revenue: 300, commission: 30 });
    expect(rows[1].visits).toBe(2);
  });
  it("computes repeat rate from all-time visits", () => {
    const all = [v("a", "s", 1, 1), v("a", "s", 1, 50), v("b", "s", 1, 50)];
    expect(repeatRate(all.filter((x) => x.at > 10), all)).toBe(0.5);
    expect(repeatRate([], all)).toBe(0);
  });
});

describe("otp and upi", () => {
  it("makes six-digit codes and checks them", () => {
    expect(makeOtp(() => 0.000123)).toBe("000123");
    const base = { expected: "123456", given: "123456", expiresAt: 10, attempts: 0, consumed: false, now: 5 };
    expect(checkOtp(base)).toBe("ok");
    expect(checkOtp({ ...base, given: "1" })).toBe("wrong_code");
    expect(checkOtp({ ...base, now: 11 })).toBe("expired");
    expect(checkOtp({ ...base, attempts: 5 })).toBe("too_many_attempts");
    expect(checkOtp({ ...base, consumed: true })).toBe("used");
  });
  it("builds a UPI intent link", () => {
    expect(upiLink({ vpa: "demo@upi", payeeName: "Demo", amount: 47_200, note: "Bill" })).toBe("upi://pay?pa=demo%40upi&pn=Demo&am=472.00&cu=INR&tn=Bill");
  });
});
