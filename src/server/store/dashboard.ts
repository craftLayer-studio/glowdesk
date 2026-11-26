import { and, desc, eq, gte, sql } from "drizzle-orm";
import { averageRating, chairUtilisation, DAY_MS, repeatRate, revenueByStylist, startOfDayIST, type VisitFact } from "@/domain";
import type { DB } from "../db/client";
import { customerPackages, memberships, orgs, outbox, rebookNudges, reviews, stylists, visits } from "../db/schema";

/** Owner dashboard for the last `days` days (IST calendar days, today included). */
export async function dashboard(db: DB, orgId: string, days = 30, now = Date.now()) {
  const since = new Date(startOfDayIST(now) - (days - 1) * DAY_MS);
  const [[org], all, team, nudges, revs, pkgSales, memSales, mkt] = await Promise.all([
    db.select().from(orgs).where(eq(orgs.id, orgId)),
    db.select().from(visits).where(eq(visits.orgId, orgId)),
    db.select().from(stylists).where(eq(stylists.orgId, orgId)),
    db.select().from(rebookNudges).where(and(eq(rebookNudges.orgId, orgId), gte(rebookNudges.sentAt, since))),
    db.select().from(reviews).where(and(eq(reviews.orgId, orgId), gte(reviews.requestedAt, since))).orderBy(desc(reviews.requestedAt)),
    db.select({ total: sql<number>`coalesce(sum(${customerPackages.pricePaise}),0)::int`, commission: sql<number>`coalesce(sum(${customerPackages.commission}),0)::int`, stylistId: customerPackages.soldByStylistId }).from(customerPackages).where(and(eq(customerPackages.orgId, orgId), gte(customerPackages.createdAt, since))).groupBy(customerPackages.soldByStylistId),
    db.select({ total: sql<number>`coalesce(sum(${memberships.pricePaise}),0)::int`, commission: sql<number>`coalesce(sum(${memberships.commission}),0)::int`, stylistId: memberships.soldByStylistId }).from(memberships).where(and(eq(memberships.orgId, orgId), gte(memberships.createdAt, since))).groupBy(memberships.soldByStylistId),
    db.select({ n: sql<number>`count(*)::int` }).from(outbox).where(and(eq(outbox.orgId, orgId), eq(outbox.purpose, "marketing"), gte(outbox.createdAt, since))),
  ]);
  const facts: VisitFact[] = all.map((v) => ({ customerId: v.customerId, stylistId: v.stylistId, total: v.total, taxable: v.taxable, commission: v.commission, serviceMinutes: v.serviceMinutes, at: v.createdAt.getTime() }));
  const period = facts.filter((f) => f.at >= since.getTime());
  const todayStart = startOfDayIST(now);
  const today = facts.filter((f) => f.at >= todayStart);
  const openMinutes = org.closeMinute - org.openMinute;
  const sales = new Map<string, { total: number; commission: number }>();
  for (const s of [...pkgSales, ...memSales]) {
    if (!s.stylistId) continue;
    const cur = sales.get(s.stylistId) ?? { total: 0, commission: 0 };
    sales.set(s.stylistId, { total: cur.total + s.total, commission: cur.commission + s.commission });
  }
  const byStylist = revenueByStylist(period);
  const answered = revs.filter((r) => r.rating !== null);
  return {
    days,
    revenue: period.reduce((s, f) => s + f.total, 0),
    visits: period.length,
    todayRevenue: today.reduce((s, f) => s + f.total, 0),
    todayVisits: today.length,
    chairUtilisation: chairUtilisation(period.reduce((s, f) => s + f.serviceMinutes, 0), org.chairs, openMinutes, days),
    todayUtilisation: chairUtilisation(today.reduce((s, f) => s + f.serviceMinutes, 0), org.chairs, openMinutes, 1),
    repeatRate: repeatRate(period, facts),
    planSales: [...pkgSales, ...memSales].reduce((s, p) => s + p.total, 0),
    byStylist: team.map((t) => {
      const r = byStylist.find((b) => b.stylistId === t.id);
      const s = sales.get(t.id);
      return { stylistId: t.id, name: t.name, visits: r?.visits ?? 0, revenue: r?.revenue ?? 0, serviceCommission: r?.commission ?? 0, salesCommission: s?.commission ?? 0 };
    }).sort((a, b) => b.revenue - a.revenue),
    nudges: {
      sent: nudges.length,
      converted: nudges.filter((n) => n.bookedVisitId).length,
      recoveredPaise: nudges.reduce((s, n) => s + n.recoveredPaise, 0),
      marketingMessages: mkt[0]?.n ?? 0,
    },
    reviews: {
      requested: revs.length,
      answered: answered.length,
      average: averageRating(answered.map((r) => r.rating!)),
      toGoogle: answered.filter((r) => r.route === "google").length,
      privateFeedback: answered.filter((r) => r.route === "private").slice(0, 10).map((r) => ({ id: r.id, rating: r.rating!, comment: r.comment, at: r.answeredAt?.getTime() ?? 0 })),
    },
  };
}
