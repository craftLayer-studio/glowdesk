import { describe, expect, it } from "vitest";
import { formatMinuteOfDay, istDate, istDateTime, istMinuteOfDay, startOfDayIST } from "./time";

describe("IST time helpers", () => {
  it("builds an instant from an IST date and minute", () => {
    expect(new Date(istDateTime("2026-11-25", 600)).toISOString()).toBe("2026-11-25T04:30:00.000Z");
  });
  it("finds IST midnight", () => {
    const at = Date.parse("2026-11-24T20:00:00Z"); // 01:30 IST on the 25th
    expect(new Date(startOfDayIST(at)).toISOString()).toBe("2026-11-24T18:30:00.000Z");
    expect(istDate(at)).toBe("2026-11-25");
    expect(istMinuteOfDay(at)).toBe(90);
  });
  it("formats minutes of day", () => {
    expect(formatMinuteOfDay(570)).toBe("09:30");
  });
});
