import { describe, expect, it } from "vitest";
import { availableSlots, checkBooking, overlaps } from "./booking";
import { istDateTime } from "./time";

const D = "2026-11-26";
const at = (m: number) => istDateTime(D, m);
const now = istDateTime("2026-11-25", 600);

describe("overlaps", () => {
  it("treats touching intervals as free", () => {
    expect(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 })).toBe(false);
    expect(overlaps({ start: 0, end: 11 }, { start: 10, end: 20 })).toBe(true);
    expect(overlaps({ start: 5, end: 6 }, { start: 0, end: 20 })).toBe(true);
  });
});

describe("availableSlots", () => {
  it("skips slots that clash with the stylist's bookings", () => {
    const busy = [{ start: at(600), end: at(645) }];
    const slots = availableSlots({ date: D, openMinute: 570, closeMinute: 720, durationMin: 30, busy, now, stepMin: 15 });
    const mins = slots.map((s) => (s - at(0)) / 60000);
    expect(mins).toEqual([570, 645, 660, 675, 690]);
  });
  it("never offers a slot that runs past closing", () => {
    const slots = availableSlots({ date: D, openMinute: 600, closeMinute: 660, durationMin: 60, busy: [], now });
    expect(slots).toHaveLength(1);
  });
  it("hides slots in the past on today's date", () => {
    const today = "2026-11-25";
    const slots = availableSlots({ date: today, openMinute: 540, closeMinute: 720, durationMin: 30, busy: [], now, leadMin: 0 });
    expect((slots[0] - istDateTime(today, 0)) / 60000).toBe(600);
  });
});

describe("checkBooking", () => {
  const base = { date: D, openMinute: 570, closeMinute: 1260, durationMin: 45, now };
  it("accepts a free slot", () => {
    expect(checkBooking({ ...base, start: at(600), busy: [] })).toBeNull();
  });
  it("rejects an overlapping booking for the same stylist", () => {
    expect(checkBooking({ ...base, start: at(630), busy: [{ start: at(600), end: at(645) }] })).toBe("overlap");
  });
  it("rejects outside hours and the past", () => {
    expect(checkBooking({ ...base, start: at(1230), busy: [] })).toBe("outside_hours");
    expect(checkBooking({ ...base, date: "2026-11-25", start: istDateTime("2026-11-25", 580), busy: [] })).toBe("in_past");
  });
});
