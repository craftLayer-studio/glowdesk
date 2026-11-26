import { describe, expect, it } from "vitest";
import { reminderDue } from "./reminder";

const H = 3_600_000;
const base = { startAt: 100 * H, createdAt: 0, reminded24: false, reminded2: false };

describe("reminderDue", () => {
  it("sends the 24-hour reminder inside its window, once", () => {
    expect(reminderDue({ ...base, now: 80 * H })).toBe("24h");
    expect(reminderDue({ ...base, now: 80 * H, reminded24: true })).toBeNull();
    expect(reminderDue({ ...base, now: 70 * H })).toBeNull();
  });
  it("sends the 2-hour reminder, then nothing after the start", () => {
    expect(reminderDue({ ...base, now: 99 * H })).toBe("2h");
    expect(reminderDue({ ...base, now: 99 * H, reminded2: true })).toBeNull();
    expect(reminderDue({ ...base, now: 101 * H })).toBeNull();
  });
  it("skips reminders for bookings made inside the window", () => {
    expect(reminderDue({ ...base, createdAt: 99 * H, now: 99.5 * H })).toBeNull();
    expect(reminderDue({ ...base, createdAt: 90 * H, now: 91 * H })).toBeNull();
  });
});
