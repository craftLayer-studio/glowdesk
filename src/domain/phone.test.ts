import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, toE164India } from "./phone";

describe("toE164India", () => {
  it.each([
    ["98765 43210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["919876543210", "+919876543210"],
  ])("normalises %s", (input, out) => expect(toE164India(input)).toBe(out));
  it("rejects landline-like or short numbers", () => {
    expect(toE164India("12345 67890")).toBeNull();
    expect(toE164India("98765")).toBeNull();
    expect(toE164India("abc")).toBeNull();
  });
  it("formats and masks", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
    expect(maskPhone("+919876543210")).toBe("+91 ••••• •3210");
  });
});
