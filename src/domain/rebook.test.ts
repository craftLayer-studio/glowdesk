import { describe, expect, it } from "vitest";
import { isRecovered, nudgeMessage, planNudges } from "./rebook";
import { DAY_MS } from "./time";

const now = 100 * DAY_MS;
const visit = (customerId: string, daysAgo: number, cycleDays = 28) => ({
  customerId,
  serviceId: "cut",
  visitId: `v-${customerId}`,
  visitedAt: now - daysAgo * DAY_MS,
  cycleDays,
});
const base = { nudges: [], marketingSent30d: new Map<string, number>(), hasUpcomingBooking: new Set<string>(), now };

describe("planNudges", () => {
  it("nudges opted-in clients whose cycle is due", () => {
    const plans = planNudges({ ...base, lastVisits: [visit("a", 30), visit("b", 10)], marketingOptIn: new Set(["a", "b"]) });
    expect(plans.map((p) => p.customerId)).toEqual(["a"]);
    expect(plans[0].kind).toBe("first");
  });
  it("never nudges clients without marketing consent or with a booking", () => {
    expect(planNudges({ ...base, lastVisits: [visit("a", 30)], marketingOptIn: new Set() })).toEqual([]);
    expect(planNudges({ ...base, lastVisits: [visit("a", 30)], marketingOptIn: new Set(["a"]), hasUpcomingBooking: new Set(["a"]) })).toEqual([]);
  });
  it("respects the 2-per-30-days cap", () => {
    expect(planNudges({ ...base, lastVisits: [visit("a", 30)], marketingOptIn: new Set(["a"]), marketingSent30d: new Map([["a", 2]]) })).toEqual([]);
  });
  it("sends one follow-up 7 days after an unconverted nudge, then stops", () => {
    const first = { customerId: "a", serviceId: "cut", lastVisitId: "v-a", kind: "first" as const, sentAt: now - 8 * DAY_MS, converted: false };
    const plans = planNudges({ ...base, lastVisits: [visit("a", 40)], marketingOptIn: new Set(["a"]), nudges: [first] });
    expect(plans.map((p) => p.kind)).toEqual(["follow_up"]);
    const again = planNudges({ ...base, lastVisits: [visit("a", 40)], marketingOptIn: new Set(["a"]), nudges: [first, { ...first, kind: "follow_up" }] });
    expect(again).toEqual([]);
    const early = planNudges({ ...base, lastVisits: [visit("a", 40)], marketingOptIn: new Set(["a"]), nudges: [{ ...first, sentAt: now - 2 * DAY_MS }] });
    expect(early).toEqual([]);
  });
});

describe("recovery and message", () => {
  it("counts visits within 14 days of the nudge", () => {
    expect(isRecovered(0, 14 * DAY_MS)).toBe(true);
    expect(isRecovered(0, 15 * DAY_MS)).toBe(false);
    expect(isRecovered(10, 5)).toBe(false);
  });
  it("writes a friendly nudge with an opt-out", () => {
    const text = nudgeMessage({ clientName: "Neha Sharma", serviceName: "Women's haircut", stylistName: "Imran", weeksSince: 6, salonName: "Demo Salon", link: "http://x", kind: "first", offer: null });
    expect(text).toContain("Hi Neha, it has been 6 weeks since your women's haircut with Imran");
    expect(text).toContain("STOP");
  });
});
