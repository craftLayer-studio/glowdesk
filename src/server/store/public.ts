import { and, asc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import {
  availableSlots,
  checkBooking,
  formatIST,
  istDate,
  MINUTE_MS,
  queuePosition,
  routeReview,
  startOfDayIST,
  waitingOrder,
} from "@/domain";
import type { Conn, DB } from "../db/client";
import { appointments, customers, membershipPlans, orgs, packages, queueEntries, reviews, services, stylists } from "../db/schema";
import { messaging } from "../adapters/messaging";
import { appUrl } from "../config";
import { consentFor, cleanName, recordConsent, requirePhone, upsertCustomer } from "./customers";
import { notFound, StoreError } from "./errors";
import { newId, newToken } from "./ids";

export async function orgByQrToken(conn: Conn, qrToken: string) {
  const [org] = await conn.select().from(orgs).where(eq(orgs.qrToken, qrToken));
  if (!org) throw notFound("Salon");
  return org;
}

export async function activeServices(conn: Conn, orgId: string) {
  return conn
    .select()
    .from(services)
    .where(and(eq(services.orgId, orgId), eq(services.active, true)))
    .orderBy(asc(services.sort), asc(services.name));
}

export async function activeStylists(conn: Conn, orgId: string) {
  return conn
    .select()
    .from(stylists)
    .where(and(eq(stylists.orgId, orgId), eq(stylists.active, true)))
    .orderBy(asc(stylists.name));
}

/** Open queue rows (waiting or in chair) with each row's service duration. */
export async function openQueue(conn: Conn, orgId: string) {
  return conn
    .select({ entry: queueEntries, durationMin: services.durationMin, serviceName: services.name, customerName: customers.name, customerPhone: customers.phone })
    .from(queueEntries)
    .innerJoin(services, eq(services.id, queueEntries.serviceId))
    .innerJoin(customers, eq(customers.id, queueEntries.customerId))
    .where(and(eq(queueEntries.orgId, orgId), inArray(queueEntries.status, ["waiting", "in_chair"])))
    .orderBy(asc(queueEntries.joinedAt));
}

function queueItems(rows: Awaited<ReturnType<typeof openQueue>>) {
  return rows.map((r) => ({ id: r.entry.id, status: r.entry.status, joinedAt: r.entry.joinedAt.getTime(), durationMin: r.durationMin }));
}

/** Everything the public QR page needs: salon, menu, stylists, current wait. */
export async function publicSalon(db: DB, qrToken: string) {
  const org = await orgByQrToken(db, qrToken);
  const [menu, team, queue, pkgs, plans] = await Promise.all([
    activeServices(db, org.id),
    activeStylists(db, org.id),
    openQueue(db, org.id),
    db.select().from(packages).where(and(eq(packages.orgId, org.id), eq(packages.active, true))),
    db.select().from(membershipPlans).where(and(eq(membershipPlans.orgId, org.id), eq(membershipPlans.active, true))),
  ]);
  const items = queueItems(queue);
  const waiting = waitingOrder(items);
  const nextEta = waiting.length === 0 ? 0 : (queuePosition([...items, { id: "_new", status: "waiting", joinedAt: Number.MAX_SAFE_INTEGER, durationMin: 0 }], "_new", team.length).etaMin ?? 0);
  return {
    salon: { name: org.name, city: org.city, address: org.address, openMinute: org.openMinute, closeMinute: org.closeMinute, isDemo: org.isDemo, gstPercent: org.gstPercent },
    services: menu.map((s) => ({ id: s.id, name: s.name, category: s.category, gender: s.gender, pricePaise: s.pricePaise, durationMin: s.durationMin })),
    stylists: team.map((s) => ({ id: s.id, name: s.name, title: s.title })),
    packages: pkgs.map((p) => ({ id: p.id, name: p.name, sessions: p.sessions, pricePaise: p.pricePaise, validityDays: p.validityDays })),
    memberships: plans.map((p) => ({ id: p.id, name: p.name, pricePaise: p.pricePaise, walletCreditPaise: p.walletCreditPaise, discountPercent: p.discountPercent })),
    queue: { waiting: waiting.length, etaMin: nextEta },
  };
}

export interface JoinInput {
  name: string;
  phone: string;
  serviceId: string;
  preferredStylistId?: string;
  consentServiceUpdates: boolean;
  consentMarketing: boolean;
}

async function serviceInOrg(conn: Conn, orgId: string, serviceId: string) {
  const [s] = await conn.select().from(services).where(and(eq(services.orgId, orgId), eq(services.id, serviceId), eq(services.active, true)));
  if (!s) throw new StoreError("Pick a service from the menu");
  return s;
}

async function stylistInOrg(conn: Conn, orgId: string, stylistId: string) {
  const [s] = await conn.select().from(stylists).where(and(eq(stylists.orgId, orgId), eq(stylists.id, stylistId), eq(stylists.active, true)));
  if (!s) throw new StoreError("Pick a stylist from the list");
  return s;
}

/** Capture a client with consent. Service-update consent is required to hold a queue place or booking. */
async function captureClient(conn: Conn, orgId: string, input: { name: string; phone: string; consentServiceUpdates: boolean; consentMarketing: boolean }, now: Date) {
  if (!input.consentServiceUpdates) throw new StoreError("We need your OK to send queue and booking updates");
  const customer = await upsertCustomer(conn, orgId, requirePhone(input.phone), cleanName(input.name));
  const prior = (await consentFor(conn, orgId, [customer.id])).get(customer.id)!;
  if (!prior.service_updates) await recordConsent(conn, orgId, customer.id, "service_updates", true, "qr", now);
  if (input.consentMarketing && !prior.marketing) await recordConsent(conn, orgId, customer.id, "marketing", true, "qr", now);
  return customer;
}

export async function joinQueue(db: DB, qrToken: string, input: JoinInput, now = new Date()) {
  return db.transaction(async (tx) => {
    const org = await orgByQrToken(tx, qrToken);
    const service = await serviceInOrg(tx, org.id, input.serviceId);
    if (input.preferredStylistId) await stylistInOrg(tx, org.id, input.preferredStylistId);
    const customer = await captureClient(tx, org.id, input, now);
    const [already] = await tx
      .select()
      .from(queueEntries)
      .where(and(eq(queueEntries.orgId, org.id), eq(queueEntries.customerId, customer.id), inArray(queueEntries.status, ["waiting", "in_chair"])));
    if (already) return { ticketToken: already.publicToken, existing: true };
    const dayStart = new Date(startOfDayIST(now.getTime()));
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(queueEntries)
      .where(and(eq(queueEntries.orgId, org.id), gte(queueEntries.joinedAt, dayStart)));
    const token = newToken();
    await tx.insert(queueEntries).values({
      id: newId(),
      orgId: org.id,
      customerId: customer.id,
      serviceId: service.id,
      preferredStylistId: input.preferredStylistId ?? null,
      status: "waiting",
      ticketNo: n + 1,
      publicToken: token,
      joinedAt: now,
    });
    const waiting = (await openQueue(tx, org.id)).filter((r) => r.entry.status === "waiting").length;
    await messaging().send(tx, {
      orgId: org.id,
      customerId: customer.id,
      channel: "whatsapp",
      purpose: "utility",
      template: "queue_joined",
      toPhone: customer.phone,
      body: `Hi ${customer.name.split(" ")[0]}, you are number ${waiting} in line at ${org.name} for ${service.name}. Track your place live: ${appUrl()}/q/${qrToken}/t/${token}`,
    });
    return { ticketToken: token, existing: false };
  });
}

export async function ticketStatus(db: DB, qrToken: string, ticketToken: string) {
  const org = await orgByQrToken(db, qrToken);
  const [row] = await db
    .select({ entry: queueEntries, serviceName: services.name, customerName: customers.name, customerId: customers.id })
    .from(queueEntries)
    .innerJoin(services, eq(services.id, queueEntries.serviceId))
    .innerJoin(customers, eq(customers.id, queueEntries.customerId))
    .where(and(eq(queueEntries.orgId, org.id), eq(queueEntries.publicToken, ticketToken)));
  if (!row) throw notFound("Ticket");
  const [queue, team] = await Promise.all([openQueue(db, org.id), activeStylists(db, org.id)]);
  const pos = queuePosition(queueItems(queue), row.entry.id, team.length);
  const stylist = row.entry.stylistId ? team.find((s) => s.id === row.entry.stylistId)?.name ?? null : null;
  const consent = (await consentFor(db, org.id, [row.customerId])).get(row.customerId)!;
  return {
    salonName: org.name,
    isDemo: org.isDemo,
    ticketNo: row.entry.ticketNo,
    firstName: row.customerName.split(" ")[0],
    serviceName: row.serviceName,
    status: row.entry.status,
    position: pos.position,
    etaMin: pos.etaMin,
    stylistName: stylist,
    marketingOptIn: consent.marketing,
    now: Date.now(),
  };
}

export async function leaveQueue(db: DB, qrToken: string, ticketToken: string) {
  const org = await orgByQrToken(db, qrToken);
  const [entry] = await db.select().from(queueEntries).where(and(eq(queueEntries.orgId, org.id), eq(queueEntries.publicToken, ticketToken)));
  if (!entry) throw notFound("Ticket");
  if (entry.status !== "waiting") throw new StoreError("You can only leave while waiting");
  await db.update(queueEntries).set({ status: "left", doneAt: new Date() }).where(and(eq(queueEntries.orgId, org.id), eq(queueEntries.id, entry.id)));
  return { ok: true };
}

/** Busy intervals for one stylist on one IST date. */
export async function stylistBusy(conn: Conn, orgId: string, stylistId: string, date: string) {
  const dayStart = new Date(Date.parse(`${date}T00:00:00+05:30`));
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const rows = await conn
    .select({ start: appointments.startAt, end: appointments.endAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.orgId, orgId),
        eq(appointments.stylistId, stylistId),
        inArray(appointments.status, ["booked", "checked_in", "completed"]),
        lt(appointments.startAt, dayEnd),
        gte(appointments.endAt, dayStart),
      ),
    );
  return rows.map((r) => ({ start: r.start.getTime(), end: r.end.getTime() }));
}

export function requireDate(date: string, now: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new StoreError("Pick a valid date");
  const today = istDate(now);
  const max = istDate(now + 60 * 86_400_000);
  if (date < today || date > max) throw new StoreError("Pick a date within the next 60 days");
  return date;
}

export async function slots(db: DB, qrToken: string, serviceId: string, stylistId: string, date: string, now = Date.now()) {
  const org = await orgByQrToken(db, qrToken);
  const service = await serviceInOrg(db, org.id, serviceId);
  await stylistInOrg(db, org.id, stylistId);
  requireDate(date, now);
  const busy = await stylistBusy(db, org.id, stylistId, date);
  return {
    slots: availableSlots({ date, openMinute: org.openMinute, closeMinute: org.closeMinute, durationMin: service.durationMin, busy, now }),
  };
}

export interface BookInput extends Omit<JoinInput, "preferredStylistId"> {
  stylistId: string;
  startAt: number;
}

const BOOKING_PROBLEMS = {
  outside_hours: "That time is outside opening hours",
  in_past: "That time has already passed",
  overlap: "That slot was just taken. Pick another time",
  bad_duration: "This service cannot be booked online",
} as const;

/**
 * Book a slot. The stylist row is locked for the transaction so two clients cannot
 * take overlapping slots with the same stylist.
 */
export async function bookAppointment(db: DB, qrToken: string, input: BookInput, now = new Date(), source: "qr" | "phone" = "qr") {
  return db.transaction(async (tx) => {
    const org = await orgByQrToken(tx, qrToken);
    const service = await serviceInOrg(tx, org.id, input.serviceId);
    await tx.execute(sql`select id from stylists where org_id = ${org.id} and id = ${input.stylistId} and active for update`);
    const stylist = await stylistInOrg(tx, org.id, input.stylistId);
    if (!Number.isInteger(input.startAt)) throw new StoreError("Pick a time slot");
    const date = requireDate(istDate(input.startAt), now.getTime());
    const busy = await stylistBusy(tx, org.id, stylist.id, date);
    const problem = checkBooking({ start: input.startAt, durationMin: service.durationMin, date, openMinute: org.openMinute, closeMinute: org.closeMinute, busy, now: now.getTime() });
    if (problem) throw new StoreError(BOOKING_PROBLEMS[problem], problem === "overlap" ? 409 : 400);
    const customer = await captureClient(tx, org.id, input, now);
    const token = newToken();
    await tx.insert(appointments).values({
      id: newId(),
      orgId: org.id,
      customerId: customer.id,
      stylistId: stylist.id,
      serviceId: service.id,
      startAt: new Date(input.startAt),
      endAt: new Date(input.startAt + service.durationMin * MINUTE_MS),
      status: "booked",
      source,
      publicToken: token,
      createdAt: now,
    });
    await messaging().send(tx, {
      orgId: org.id,
      customerId: customer.id,
      channel: "whatsapp",
      purpose: "utility",
      template: "booking_confirmed",
      toPhone: customer.phone,
      body: `Booked: ${service.name} with ${stylist.name} at ${org.name}, ${formatIST(input.startAt)}. We will remind you 2 hours before. Manage: ${appUrl()}/q/${qrToken}/b/${token}`,
    });
    return { bookingToken: token };
  });
}

export async function bookingStatus(db: DB, qrToken: string, bookingToken: string) {
  const org = await orgByQrToken(db, qrToken);
  const [row] = await db
    .select({ appt: appointments, serviceName: services.name, stylistName: stylists.name, customerName: customers.name, customerId: customers.id })
    .from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(stylists, eq(stylists.id, appointments.stylistId))
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(and(eq(appointments.orgId, org.id), eq(appointments.publicToken, bookingToken)));
  if (!row) throw notFound("Booking");
  const consent = (await consentFor(db, org.id, [row.customerId])).get(row.customerId)!;
  return {
    salonName: org.name,
    isDemo: org.isDemo,
    firstName: row.customerName.split(" ")[0],
    serviceName: row.serviceName,
    stylistName: row.stylistName,
    startAt: row.appt.startAt.getTime(),
    status: row.appt.status,
    marketingOptIn: consent.marketing,
  };
}

export async function cancelBooking(db: DB, qrToken: string, bookingToken: string) {
  const org = await orgByQrToken(db, qrToken);
  const [appt] = await db.select().from(appointments).where(and(eq(appointments.orgId, org.id), eq(appointments.publicToken, bookingToken)));
  if (!appt) throw notFound("Booking");
  if (appt.status !== "booked") throw new StoreError("This booking can no longer be cancelled");
  await db.update(appointments).set({ status: "cancelled" }).where(and(eq(appointments.orgId, org.id), eq(appointments.id, appt.id)));
  return { ok: true };
}

/** Opt out of marketing from a ticket or booking link. */
export async function optOutByToken(db: DB, qrToken: string, token: string) {
  const org = await orgByQrToken(db, qrToken);
  const [q] = await db.select({ c: queueEntries.customerId }).from(queueEntries).where(and(eq(queueEntries.orgId, org.id), eq(queueEntries.publicToken, token)));
  const [a] = q ? [] : await db.select({ c: appointments.customerId }).from(appointments).where(and(eq(appointments.orgId, org.id), eq(appointments.publicToken, token)));
  const customerId = q?.c ?? a?.c;
  if (!customerId) throw notFound("Link");
  await recordConsent(db, org.id, customerId, "marketing", false, "qr");
  return { ok: true };
}

export async function reviewByToken(db: DB, token: string) {
  const [row] = await db
    .select({ review: reviews, salonName: orgs.name, isDemo: orgs.isDemo, googleUrl: orgs.googleReviewUrl, customerName: customers.name })
    .from(reviews)
    .innerJoin(orgs, eq(orgs.id, reviews.orgId))
    .innerJoin(customers, eq(customers.id, reviews.customerId))
    .where(eq(reviews.token, token));
  if (!row) throw notFound("Review link");
  return row;
}

export async function publicReview(db: DB, token: string) {
  const row = await reviewByToken(db, token);
  return {
    salonName: row.salonName,
    isDemo: row.isDemo,
    firstName: row.customerName.split(" ")[0],
    answered: row.review.rating !== null,
    rating: row.review.rating,
    route: row.review.route,
    googleUrl: row.review.route === "google" ? row.googleUrl : null,
  };
}

export async function submitReview(db: DB, token: string, rating: number, comment: string) {
  const row = await reviewByToken(db, token);
  if (row.review.rating !== null) throw new StoreError("Thanks, we already have your rating", 409);
  let route;
  try {
    route = routeReview(rating);
  } catch {
    throw new StoreError("Pick 1 to 5 stars");
  }
  await db
    .update(reviews)
    .set({ rating, comment: comment.trim().slice(0, 1000), route, answeredAt: new Date() })
    .where(and(eq(reviews.orgId, row.review.orgId), eq(reviews.id, row.review.id), ne(reviews.token, "")));
  return { route, googleUrl: route === "google" ? row.googleUrl : null };
}
