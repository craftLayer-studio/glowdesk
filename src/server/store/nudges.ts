import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { DAY_MS, planNudges, nudgeMessage, type LastServiceVisit } from "@/domain";
import type { DB } from "../db/client";
import { appointments, customers, orgs, outbox, rebookNudges, services, stylists, visitLines, visits } from "../db/schema";
import { messaging } from "../adapters/messaging";
import { appUrl } from "../config";
import { consentFor } from "./customers";
import { newId } from "./ids";

/** Each client's latest visit per service that has a rebooking cycle. */
async function lastServiceVisits(db: DB, orgId: string): Promise<(LastServiceVisit & { stylistId: string })[]> {
  const rows = await db
    .select({ customerId: visits.customerId, serviceId: visitLines.serviceId, visitId: visits.id, visitedAt: visits.createdAt, cycleDays: services.cycleDays, stylistId: visits.stylistId })
    .from(visitLines)
    .innerJoin(visits, eq(visits.id, visitLines.visitId))
    .innerJoin(services, eq(services.id, visitLines.serviceId))
    .where(and(eq(visitLines.orgId, orgId), sql`${services.cycleDays} > 0`))
    .orderBy(desc(visits.createdAt));
  const seen = new Set<string>();
  const out: (LastServiceVisit & { stylistId: string })[] = [];
  for (const r of rows) {
    const key = `${r.customerId}:${r.serviceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, visitedAt: r.visitedAt.getTime() });
  }
  return out;
}

/** Clients whose service cycle is due (or due within `withinDays`), for the owner's due list. */
export async function dueList(db: DB, orgId: string, now = Date.now(), withinDays = 7) {
  const last = await lastServiceVisits(db, orgId);
  const due = last.filter((v) => v.visitedAt + v.cycleDays * DAY_MS <= now + withinDays * DAY_MS);
  const ids = [...new Set(due.map((d) => d.customerId))];
  const [consent, names, menu] = await Promise.all([
    consentFor(db, orgId, ids),
    ids.length ? db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(and(eq(customers.orgId, orgId), inArray(customers.id, ids))) : [],
    db.select({ id: services.id, name: services.name }).from(services).where(eq(services.orgId, orgId)),
  ]);
  return due
    .map((d) => ({
      customerId: d.customerId,
      customerName: names.find((n) => n.id === d.customerId)?.name ?? "",
      serviceName: menu.find((m) => m.id === d.serviceId)?.name ?? "",
      lastVisitAt: d.visitedAt,
      dueAt: d.visitedAt + d.cycleDays * DAY_MS,
      marketingOptIn: consent.get(d.customerId)?.marketing ?? false,
    }))
    .sort((a, b) => a.dueAt - b.dueAt);
}

/**
 * The rebooking job: plan due nudges with the domain rules and send them through the
 * messaging adapter (simulated WhatsApp outbox). Safe to run repeatedly; a cron would call it daily.
 */
export async function runNudges(db: DB, orgId: string, now = new Date()) {
  const t = now.getTime();
  const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId));
  const last = await lastServiceVisits(db, orgId);
  const ids = [...new Set(last.map((l) => l.customerId))];
  const consent = await consentFor(db, orgId, ids);
  const optIn = new Set(ids.filter((id) => consent.get(id)?.marketing));
  const prior = await db.select().from(rebookNudges).where(eq(rebookNudges.orgId, orgId));
  const sent30 = await db
    .select({ customerId: outbox.customerId, n: sql<number>`count(*)::int` })
    .from(outbox)
    .where(and(eq(outbox.orgId, orgId), eq(outbox.purpose, "marketing"), gte(outbox.createdAt, new Date(t - 30 * DAY_MS))))
    .groupBy(outbox.customerId);
  const upcoming = await db
    .select({ c: appointments.customerId })
    .from(appointments)
    .where(and(eq(appointments.orgId, orgId), eq(appointments.status, "booked"), gte(appointments.startAt, now)));
  const plans = planNudges({
    lastVisits: last,
    nudges: prior.map((n) => ({ customerId: n.customerId, serviceId: n.serviceId, lastVisitId: n.lastVisitId, kind: n.kind, sentAt: n.sentAt.getTime(), converted: n.bookedVisitId !== null })),
    marketingOptIn: optIn,
    marketingSent30d: new Map(sent30.filter((s) => s.customerId).map((s) => [s.customerId!, s.n])),
    hasUpcomingBooking: new Set(upcoming.map((u) => u.c)),
    now: t,
  });
  if (plans.length === 0) return { sent: 0 };
  const [people, menu, team] = await Promise.all([
    db.select().from(customers).where(and(eq(customers.orgId, orgId), inArray(customers.id, plans.map((p) => p.customerId)))),
    db.select().from(services).where(eq(services.orgId, orgId)),
    db.select().from(stylists).where(eq(stylists.orgId, orgId)),
  ]);
  await db.transaction(async (tx) => {
    for (const p of plans) {
      const c = people.find((x) => x.id === p.customerId)!;
      const s = menu.find((x) => x.id === p.serviceId)!;
      const v = last.find((x) => x.visitId === p.lastVisitId && x.serviceId === p.serviceId)!;
      const body = nudgeMessage({
        clientName: c.name,
        serviceName: s.name,
        stylistName: team.find((x) => x.id === v.stylistId)?.name ?? null,
        weeksSince: Math.max(1, Math.round((t - v.visitedAt) / (7 * DAY_MS))),
        salonName: org.name,
        link: `${appUrl()}/q/${org.qrToken}?service=${s.id}`,
        kind: p.kind,
        offer: org.followUpOffer || null,
      });
      const msg = await messaging().send(tx, { orgId, customerId: c.id, channel: "whatsapp", purpose: "marketing", template: `rebook_${p.kind}`, toPhone: c.phone, body });
      await tx.insert(rebookNudges).values({ id: newId(), orgId, customerId: c.id, serviceId: s.id, lastVisitId: p.lastVisitId, kind: p.kind, dueAt: new Date(p.dueAt), sentAt: now, outboxId: msg.id });
    }
  });
  return { sent: plans.length };
}
