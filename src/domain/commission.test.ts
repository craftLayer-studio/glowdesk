import { describe, expect, it } from "vitest";
import { saleCommission, serviceCommission, totalCommissionByStylist } from "./commission";

describe("commission", () => {
  it("applies percent rules on the net amount", () => {
    expect(serviceCommission({ type: "percent", serviceValue: 30, packagePercent: 5 }, 50_000)).toBe(15_000);
  });
  it("applies flat rules, never above the line value", () => {
    const rule = { type: "flat" as const, serviceValue: 10_000, packagePercent: 0 };
    expect(serviceCommission(rule, 50_000)).toBe(10_000);
    expect(serviceCommission(rule, 5_000)).toBe(5_000);
  });
  it("lets a service override win", () => {
    expect(serviceCommission({ type: "flat", serviceValue: 10_000, packagePercent: 0 }, 200_000, 15)).toBe(30_000);
  });
  it("pays a percent on package sales and sums per stylist", () => {
    expect(saleCommission({ type: "percent", serviceValue: 30, packagePercent: 5 }, 600_000)).toBe(30_000);
    const m = totalCommissionByStylist([{ stylistId: "a", commission: 10 }, { stylistId: "a", commission: 5 }, { stylistId: "b", commission: 1 }]);
    expect(m.get("a")).toBe(15);
  });
});
