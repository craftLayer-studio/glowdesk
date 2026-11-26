import { serviceCommission, type CommissionRule } from "./commission";
import { percentOf, type Paise } from "./money";

export const PAYMENT_METHODS = ["cash", "upi", "card", "wallet"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface BillService {
  serviceId: string;
  name: string;
  price: Paise;
  commissionOverridePercent: number | null;
}

export interface OwnedPackage {
  id: string;
  serviceId: string;
  sessionsLeft: number;
  expiresAt: number;
  /** Package price divided by its sessions; used for commission on redemptions. */
  sessionValue: Paise;
}

export interface ActiveMembership {
  id: string;
  discountPercent: number;
  walletBalance: Paise;
  expiresAt: number;
}

export interface BillLine {
  serviceId: string;
  name: string;
  listPrice: Paise;
  discount: Paise;
  net: Paise;
  /** Set when a package session paid for this line. */
  customerPackageId: string | null;
  commission: Paise;
}

export interface Bill {
  lines: BillLine[];
  subtotal: Paise;
  discount: Paise;
  taxable: Paise;
  gst: Paise;
  total: Paise;
  commission: Paise;
  /** Sessions to deduct per customer package id. */
  packageUses: Record<string, number>;
  walletDebit: Paise;
}

export class BillError extends Error {}

/**
 * Price a visit. Order of benefits per line: an unexpired package session for that
 * service first (line becomes free), otherwise the membership discount.
 * GST is added on the discounted (taxable) amount. Commission is on pre-tax value.
 */
export function priceVisit(input: {
  services: readonly BillService[];
  packages: readonly OwnedPackage[];
  membership: ActiveMembership | null;
  gstPercent: number;
  rule: CommissionRule;
  method: PaymentMethod;
  now: number;
}): Bill {
  if (input.services.length === 0) throw new BillError("Add at least one service");
  const remaining = new Map(input.packages.filter((p) => p.expiresAt > input.now && p.sessionsLeft > 0).map((p) => [p.id, p.sessionsLeft]));
  const membership = input.membership && input.membership.expiresAt > input.now ? input.membership : null;
  const packageUses: Record<string, number> = {};
  const lines: BillLine[] = input.services.map((s) => {
    const pkg = input.packages.find((p) => p.serviceId === s.serviceId && (remaining.get(p.id) ?? 0) > 0);
    if (pkg) {
      remaining.set(pkg.id, (remaining.get(pkg.id) ?? 0) - 1);
      packageUses[pkg.id] = (packageUses[pkg.id] ?? 0) + 1;
      return {
        serviceId: s.serviceId,
        name: s.name,
        listPrice: s.price,
        discount: s.price,
        net: 0,
        customerPackageId: pkg.id,
        commission: serviceCommission(input.rule, pkg.sessionValue, s.commissionOverridePercent),
      };
    }
    const discount = membership ? percentOf(s.price, membership.discountPercent) : 0;
    const net = s.price - discount;
    return {
      serviceId: s.serviceId,
      name: s.name,
      listPrice: s.price,
      discount,
      net,
      customerPackageId: null,
      commission: serviceCommission(input.rule, net, s.commissionOverridePercent),
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.listPrice, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  const taxable = subtotal - discount;
  const gst = percentOf(taxable, input.gstPercent);
  const total = taxable + gst;
  let walletDebit = 0;
  if (input.method === "wallet") {
    if (!membership) throw new BillError("Client has no active membership wallet");
    if (membership.walletBalance < total) throw new BillError("Wallet balance is too low for this bill");
    walletDebit = total;
  }
  return {
    lines,
    subtotal,
    discount,
    taxable,
    gst,
    total,
    commission: lines.reduce((s, l) => s + l.commission, 0),
    packageUses,
    walletDebit,
  };
}
