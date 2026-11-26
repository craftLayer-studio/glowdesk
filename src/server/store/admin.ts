import { and, asc, desc, eq } from "drizzle-orm";
import type { DB } from "../db/client";
import { membershipPlans, orgs, outbox, packages, services, stylists } from "../db/schema";
import { notFound, StoreError } from "./errors";
import { newId } from "./ids";

export async function settings(db: DB, orgId: string) {
  const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId));
  if (!org) throw notFound("Salon");
  return org;
}

export interface SettingsInput {
  name: string;
  city: string;
  address: string;
  chairs: number;
  openMinute: number;
  closeMinute: number;
  gstPercent: number;
  gstin: string;
  upiVpa: string;
  googleReviewUrl: string;
  followUpOffer: string;
}

export async function updateSettings(db: DB, orgId: string, s: SettingsInput) {
  if (s.chairs < 1 || s.chairs > 50) throw new StoreError("Chairs must be 1 to 50");
  if (s.openMinute < 0 || s.closeMinute > 1440 || s.closeMinute <= s.openMinute) throw new StoreError("Closing time must be after opening time");
  if (![0, 5, 12, 18].includes(s.gstPercent)) throw new StoreError("GST must be 0, 5, 12 or 18 percent");
  if (s.googleReviewUrl && !/^https:\/\//.test(s.googleReviewUrl)) throw new StoreError("Google review link must start with https://");
  if (s.upiVpa && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(s.upiVpa)) throw new StoreError("UPI ID looks wrong (name@bank)");
  await db.update(orgs).set(s).where(eq(orgs.id, orgId));
  return { ok: true };
}

export interface ServiceInput {
  name: string;
  category: string;
  gender: "women" | "men" | "unisex";
  pricePaise: number;
  durationMin: number;
  cycleDays: number;
  commissionOverridePercent: number | null;
  active: boolean;
}

function checkService(s: ServiceInput) {
  if (!Number.isInteger(s.pricePaise) || s.pricePaise < 0 || s.pricePaise > 10_000_000) throw new StoreError("Price must be ₹0 to ₹1,00,000");
  if (!Number.isInteger(s.durationMin) || s.durationMin < 5 || s.durationMin > 480) throw new StoreError("Duration must be 5 to 480 minutes");
  if (!Number.isInteger(s.cycleDays) || s.cycleDays < 0 || s.cycleDays > 365) throw new StoreError("Rebook cycle must be 0 to 365 days");
  if (s.commissionOverridePercent !== null && (s.commissionOverridePercent < 0 || s.commissionOverridePercent > 100)) throw new StoreError("Commission override must be 0 to 100%");
}

export async function listServices(db: DB, orgId: string) {
  return db.select().from(services).where(eq(services.orgId, orgId)).orderBy(asc(services.sort), asc(services.name));
}

export async function saveService(db: DB, orgId: string, id: string | null, s: ServiceInput) {
  checkService(s);
  if (id) {
    const res = await db.update(services).set(s).where(and(eq(services.orgId, orgId), eq(services.id, id))).returning({ id: services.id });
    if (res.length === 0) throw notFound("Service");
    return { id };
  }
  const newSvc = { id: newId(), orgId, ...s, sort: 999 };
  await db.insert(services).values(newSvc);
  return { id: newSvc.id };
}

export interface StylistInput {
  name: string;
  phone: string;
  title: string;
  commissionType: "percent" | "flat";
  commissionValue: number;
  packagePercent: number;
  active: boolean;
}

export async function listStylists(db: DB, orgId: string) {
  return db.select().from(stylists).where(eq(stylists.orgId, orgId)).orderBy(asc(stylists.name));
}

export async function saveStylist(db: DB, orgId: string, id: string | null, s: StylistInput) {
  if (s.commissionType === "percent" && (s.commissionValue < 0 || s.commissionValue > 100)) throw new StoreError("Commission must be 0 to 100%");
  if (s.commissionType === "flat" && (!Number.isInteger(s.commissionValue) || s.commissionValue < 0)) throw new StoreError("Flat commission must be a positive amount");
  if (s.packagePercent < 0 || s.packagePercent > 100) throw new StoreError("Package commission must be 0 to 100%");
  if (id) {
    const res = await db.update(stylists).set(s).where(and(eq(stylists.orgId, orgId), eq(stylists.id, id))).returning({ id: stylists.id });
    if (res.length === 0) throw notFound("Stylist");
    return { id };
  }
  const row = { id: newId(), orgId, ...s };
  await db.insert(stylists).values(row);
  return { id: row.id };
}

export async function listPlans(db: DB, orgId: string) {
  const [pkgs, plans] = await Promise.all([
    db.select({ p: packages, serviceName: services.name }).from(packages).innerJoin(services, eq(services.id, packages.serviceId)).where(eq(packages.orgId, orgId)),
    db.select().from(membershipPlans).where(eq(membershipPlans.orgId, orgId)),
  ]);
  return { packages: pkgs.map((r) => ({ ...r.p, serviceName: r.serviceName })), memberships: plans };
}

export async function createPackage(db: DB, orgId: string, p: { name: string; serviceId: string; sessions: number; pricePaise: number; validityDays: number }) {
  const [svc] = await db.select().from(services).where(and(eq(services.orgId, orgId), eq(services.id, p.serviceId)));
  if (!svc) throw notFound("Service");
  if (p.sessions < 2 || p.sessions > 50) throw new StoreError("Sessions must be 2 to 50");
  if (p.pricePaise <= 0 || p.validityDays < 7 || p.validityDays > 730) throw new StoreError("Check the price and validity (7 to 730 days)");
  const row = { id: newId(), orgId, ...p };
  await db.insert(packages).values(row);
  return { id: row.id };
}

export async function createMembershipPlan(db: DB, orgId: string, p: { name: string; pricePaise: number; walletCreditPaise: number; discountPercent: number; validityDays: number }) {
  if (p.pricePaise <= 0 || p.walletCreditPaise < 0 || p.discountPercent < 0 || p.discountPercent > 50) throw new StoreError("Check price, wallet credit and discount (0 to 50%)");
  if (p.validityDays < 30 || p.validityDays > 730) throw new StoreError("Validity must be 30 to 730 days");
  const row = { id: newId(), orgId, ...p };
  await db.insert(membershipPlans).values(row);
  return { id: row.id };
}

export async function listOutbox(db: DB, orgId: string, limit = 100) {
  return db.select().from(outbox).where(eq(outbox.orgId, orgId)).orderBy(desc(outbox.createdAt)).limit(limit);
}
