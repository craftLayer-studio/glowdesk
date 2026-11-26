import type { Paise } from "./money";

export interface VisitFact {
  customerId: string;
  stylistId: string;
  total: Paise;
  /** Pre-tax value of the work (taxable + package-session value is not counted). */
  taxable: Paise;
  commission: Paise;
  serviceMinutes: number;
  at: number;
}

/**
 * Chair utilisation: minutes of service delivered divided by chair-minutes available
 * (chairs × opening minutes per day × days). 0..1, capped at 1.
 */
export function chairUtilisation(serviceMinutes: number, chairs: number, openMinutesPerDay: number, days: number): number {
  const capacity = chairs * openMinutesPerDay * days;
  if (capacity <= 0) return 0;
  return Math.min(1, serviceMinutes / capacity);
}

export interface StylistRevenue {
  stylistId: string;
  visits: number;
  revenue: Paise;
  commission: Paise;
}

export function revenueByStylist(visits: readonly VisitFact[]): StylistRevenue[] {
  const map = new Map<string, StylistRevenue>();
  for (const v of visits) {
    const row = map.get(v.stylistId) ?? { stylistId: v.stylistId, visits: 0, revenue: 0, commission: 0 };
    row.visits += 1;
    row.revenue += v.total;
    row.commission += v.commission;
    map.set(v.stylistId, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

/**
 * Repeat rate: of the clients who visited in the period, the share who have
 * at least one earlier visit (before the period or earlier in it).
 */
export function repeatRate(periodVisits: readonly VisitFact[], allVisits: readonly VisitFact[]): number {
  const clients = new Set(periodVisits.map((v) => v.customerId));
  if (clients.size === 0) return 0;
  let repeat = 0;
  for (const c of clients) {
    if (allVisits.filter((v) => v.customerId === c).length >= 2) repeat += 1;
  }
  return repeat / clients.size;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
