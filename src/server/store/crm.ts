import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import type { DB } from "../db/client";
import { customerPackages, customers, membershipPlans, memberships, packages, services, stylists, visitLines, visits } from "../db/schema";
import { consentFor, consentHistory, recordConsent } from "./customers";
import { notFound, StoreError } from "./errors";

/** Client list with spend, visit count, last visit and consent. */
export async function clientList(db: DB, orgId: string) {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      createdAt: customers.createdAt,
      visits: sql<number>`count(${visits.id})::int`,
      spend: sql<number>`coalesce(sum(${visits.total}), 0)::int`,
      lastVisit: sql<Date | null>`max(${visits.createdAt})`,
    })
    .from(customers)
    .leftJoin(visits, and(eq(visits.customerId, customers.id), eq(visits.orgId, orgId)))
    .where(eq(customers.orgId, orgId))
    .groupBy(customers.id)
    .orderBy(desc(sql`max(${visits.createdAt})`), asc(customers.name));
  const consent = await consentFor(db, orgId, rows.map((r) => r.id));
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.getTime(),
    lastVisit: r.lastVisit ? new Date(r.lastVisit).getTime() : null,
    serviceUpdates: consent.get(r.id)?.service_updates ?? false,
    marketing: consent.get(r.id)?.marketing ?? false,
  }));
}

export async function clientDetail(db: DB, orgId: string, customerId: string, now = new Date()) {
  const [c] = await db.select().from(customers).where(and(eq(customers.orgId, orgId), eq(customers.id, customerId)));
  if (!c) throw notFound("Client");
  const [history, lines, pkgs, mems, consents] = await Promise.all([
    db
      .select({ v: visits, stylistName: stylists.name })
      .from(visits)
      .innerJoin(stylists, eq(stylists.id, visits.stylistId))
      .where(and(eq(visits.orgId, orgId), eq(visits.customerId, customerId)))
      .orderBy(desc(visits.createdAt)),
    db.select({ visitId: visitLines.visitId, name: visitLines.name }).from(visitLines).innerJoin(visits, eq(visits.id, visitLines.visitId)).where(and(eq(visitLines.orgId, orgId), eq(visits.customerId, customerId))),
    db
      .select({ cp: customerPackages, name: packages.name, sessions: packages.sessions })
      .from(customerPackages)
      .innerJoin(packages, eq(packages.id, customerPackages.packageId))
      .where(and(eq(customerPackages.orgId, orgId), eq(customerPackages.customerId, customerId), gt(customerPackages.expiresAt, now))),
    db
      .select({ m: memberships, name: membershipPlans.name })
      .from(memberships)
      .innerJoin(membershipPlans, eq(membershipPlans.id, memberships.planId))
      .where(and(eq(memberships.orgId, orgId), eq(memberships.customerId, customerId), gt(memberships.expiresAt, now))),
    consentHistory(db, orgId, customerId),
  ]);
  const consent = (await consentFor(db, orgId, [customerId])).get(customerId)!;
  const fav = new Map<string, number>();
  for (const h of history) fav.set(h.stylistName, (fav.get(h.stylistName) ?? 0) + 1);
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    notes: c.notes,
    consent,
    favouriteStylist: [...fav.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    spend: history.reduce((s, h) => s + h.v.total, 0),
    visits: history.map((h) => ({
      id: h.v.id,
      billNo: h.v.billNo,
      at: h.v.createdAt.getTime(),
      total: h.v.total,
      stylistName: h.stylistName,
      method: h.v.paymentMethod,
      services: lines.filter((l) => l.visitId === h.v.id).map((l) => l.name),
    })),
    packages: pkgs.map((p) => ({ id: p.cp.id, name: p.name, sessionsLeft: p.cp.sessionsLeft, sessions: p.sessions, expiresAt: p.cp.expiresAt.getTime() })),
    memberships: mems.map((m) => ({ id: m.m.id, name: m.name, walletBalance: m.m.walletBalancePaise, discountPercent: m.m.discountPercent, expiresAt: m.m.expiresAt.getTime() })),
    consentLog: consents.map((r) => ({ purpose: r.purpose, granted: r.granted, channel: r.channel, noticeVersion: r.noticeVersion, at: r.createdAt.getTime() })),
  };
}

export async function updateClientNotes(db: DB, orgId: string, customerId: string, notes: string) {
  if (notes.length > 2000) throw new StoreError("Notes are limited to 2,000 characters");
  const res = await db.update(customers).set({ notes }).where(and(eq(customers.orgId, orgId), eq(customers.id, customerId))).returning({ id: customers.id });
  if (res.length === 0) throw notFound("Client");
  return { ok: true };
}

/** Staff records a consent change the client asked for (for example "stop offers"). */
export async function setClientConsent(db: DB, orgId: string, customerId: string, purpose: "service_updates" | "marketing", granted: boolean) {
  const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.orgId, orgId), eq(customers.id, customerId)));
  if (!c) throw notFound("Client");
  await recordConsent(db, orgId, customerId, purpose, granted, "staff");
  return { ok: true };
}

export async function lookupServices(db: DB, orgId: string) {
  return db.select().from(services).where(eq(services.orgId, orgId)).orderBy(asc(services.sort));
}
