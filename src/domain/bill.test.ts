import { describe, expect, it } from "vitest";
import { BillError, priceVisit } from "./bill";

const rule = { type: "percent" as const, serviceValue: 30, packagePercent: 5 };
const cut = { serviceId: "cut", name: "Haircut", price: 40_000, commissionOverridePercent: null };
const facial = { serviceId: "facial", name: "Facial", price: 120_000, commissionOverridePercent: 20 };
const now = 1_000;

describe("priceVisit", () => {
  it("adds GST on the taxable amount and computes commission pre-tax", () => {
    const bill = priceVisit({ services: [cut, facial], packages: [], membership: null, gstPercent: 18, rule, method: "cash", now });
    expect(bill.subtotal).toBe(160_000);
    expect(bill.gst).toBe(28_800);
    expect(bill.total).toBe(188_800);
    expect(bill.commission).toBe(12_000 + 24_000);
  });
  it("uses a package session before a membership discount", () => {
    const bill = priceVisit({
      services: [facial, cut],
      packages: [{ id: "p1", serviceId: "facial", sessionsLeft: 1, expiresAt: 9_999, sessionValue: 100_000 }],
      membership: { id: "m1", discountPercent: 10, walletBalance: 0, expiresAt: 9_999 },
      gstPercent: 0,
      rule,
      method: "cash",
      now,
    });
    expect(bill.lines[0].net).toBe(0);
    expect(bill.lines[0].customerPackageId).toBe("p1");
    expect(bill.lines[0].commission).toBe(20_000);
    expect(bill.lines[1].net).toBe(36_000);
    expect(bill.total).toBe(36_000);
    expect(bill.packageUses).toEqual({ p1: 1 });
  });
  it("ignores expired packages and memberships", () => {
    const bill = priceVisit({
      services: [facial],
      packages: [{ id: "p1", serviceId: "facial", sessionsLeft: 3, expiresAt: 500, sessionValue: 1 }],
      membership: { id: "m1", discountPercent: 10, walletBalance: 0, expiresAt: 500 },
      gstPercent: 0,
      rule,
      method: "cash",
      now,
    });
    expect(bill.total).toBe(120_000);
  });
  it("debits the wallet only when the balance covers the bill", () => {
    const membership = { id: "m1", discountPercent: 0, walletBalance: 50_000, expiresAt: 9_999 };
    expect(priceVisit({ services: [cut], packages: [], membership, gstPercent: 0, rule, method: "wallet", now }).walletDebit).toBe(40_000);
    expect(() => priceVisit({ services: [facial], packages: [], membership, gstPercent: 0, rule, method: "wallet", now })).toThrow(BillError);
    expect(() => priceVisit({ services: [], packages: [], membership: null, gstPercent: 0, rule, method: "cash", now })).toThrow(BillError);
  });
});
