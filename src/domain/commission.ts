import { percentOf, type Paise } from "./money";

export type CommissionType = "percent" | "flat";

export interface CommissionRule {
  type: CommissionType;
  /** Percent (0-100) for "percent", paise per service for "flat". */
  serviceValue: number;
  /** Percent of package and membership sales credited to the seller. */
  packagePercent: number;
}

/**
 * Commission on one service line. `amount` is the pre-tax value of the work
 * (after discounts; for package redemptions, the per-session value of the package).
 * A service-level percent override wins over the stylist's rule.
 */
export function serviceCommission(rule: CommissionRule, amount: Paise, overridePercent?: number | null): Paise {
  if (overridePercent !== undefined && overridePercent !== null) return percentOf(amount, overridePercent);
  if (rule.type === "flat") return Math.min(rule.serviceValue, amount);
  return percentOf(amount, rule.serviceValue);
}

export function saleCommission(rule: CommissionRule, salePrice: Paise): Paise {
  return percentOf(salePrice, rule.packagePercent);
}

export interface CommissionRow {
  stylistId: string;
  commission: Paise;
}

export function totalCommissionByStylist(rows: readonly CommissionRow[]): Map<string, Paise> {
  const out = new Map<string, Paise>();
  for (const r of rows) out.set(r.stylistId, (out.get(r.stylistId) ?? 0) + r.commission);
  return out;
}
