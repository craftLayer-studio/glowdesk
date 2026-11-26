import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { canMoveQueue, startOfDayIST, waitingOrder, type QueueStatus } from "@/domain";
import type { DB } from "../db/client";
import { appointments, customers, orgs, queueEntries, services, stylists } from "../db/schema";
import { messaging } from "../adapters/messaging";
import { appUrl } from "../config";
import { notFound, StoreError } from "./errors";
import { activeServices, activeStylists, bookAppointment, joinQueue, openQueue } from "./public";

/** The front-desk screen: live queue, today's diary, team. */
export async function floor(db: DB, orgId: string, now = Date.now()) {
  const dayStart = new Date(startOfDayIST(now));
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const [[org], queue, team, menu, diary] = await Promise.all([
    db.select().from(orgs).where(eq(orgs.id, orgId)),
    openQueue(db, orgId),
    activeStylists(db, orgId),
    activeServices(db, orgId),
    db
      .select({ appt: appointments, serviceName: services.name, durationMin: services.durationMin, customerName: customers.name, customerPhone: customers.phone, stylistName: stylists.name })
      .from(appointments)
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .innerJoin(customers, eq(customers.id, appointments.customerId))
      .innerJoin(stylists, eq(stylists.id, appointments.stylistId))
      .where(and(eq(appointments.orgId, orgId), gte(appointments.startAt, dayStart), lt(appointments.startAt, dayEnd)))
      .orderBy(asc(appointments.startAt)),
  ]);
  const order = waitingOrder(queue.map((r) => ({ id: r.entry.id, status: r.entry.status, joinedAt: r.entry.joinedAt.getTime(), durationMin: r.durationMin })));
  const pos = new Map(order.map((o, i) => [o.id, i + 1]));
  const name = (id: string | null) => (id ? team.find((s) => s.id === id)?.name ?? null : null);
  return {
    now,
    salon: { name: org.name, qrToken: org.qrToken, isDemo: org.isDemo },
    queue: queue.map((r) => ({
      id: r.entry.id,
      ticketNo: r.entry.ticketNo,
      status: r.entry.status,
      position: pos.get(r.entry.id) ?? null,
      customerId: r.entry.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      serviceId: r.entry.serviceId,
      serviceName: r.serviceName,
      durationMin: r.durationMin,
      preferredStylist: name(r.entry.preferredStylistId),
      stylistId: r.entry.stylistId,
      stylistName: name(r.entry.stylistId),
      joinedAt: r.entry.joinedAt.getTime(),
    })),
    appointments: diary.map((r) => ({
      id: r.appt.id,
      status: r.appt.status,
      startAt: r.appt.startAt.getTime(),
      endAt: r.appt.endAt.getTime(),
      customerId: r.appt.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      serviceId: r.appt.serviceId,
      serviceName: r.serviceName,
      stylistId: r.appt.stylistId,
      stylistName: r.stylistName,
      source: r.appt.source,
    })),
    stylists: team.map((s) => ({ id: s.id, name: s.name, title: s.title })),
    services: menu.map((s) => ({ id: s.id, name: s.name, pricePaise: s.pricePaise, durationMin: s.durationMin, category: s.category })),
  };
}

/** Move a queue entry. Starting someone requires a stylist; the next client in line gets a heads-up. */
export async function moveQueue(db: DB, orgId: string, entryId: string, to: QueueStatus, stylistId?: string) {
  return db.transaction(async (tx) => {
    const [entry] = await tx.select().from(queueEntries).where(and(eq(queueEntries.orgId, orgId), eq(queueEntries.id, entryId)));
    if (!entry) throw notFound("Queue entry");
    if (to === "done") throw new StoreError("Finish a client through checkout");
    if (!canMoveQueue(entry.status, to)) throw new StoreError(`Cannot move from ${entry.status} to ${to}`, 409);
    const patch: Partial<typeof queueEntries.$inferInsert> = { status: to };
    if (to === "in_chair") {
      if (!stylistId) throw new StoreError("Pick the stylist taking this client");
      const [s] = await tx.select().from(stylists).where(and(eq(stylists.orgId, orgId), eq(stylists.id, stylistId), eq(stylists.active, true)));
      if (!s) throw new StoreError("Pick a stylist from the list");
      patch.stylistId = s.id;
      patch.startedAt = new Date();
    } else {
      patch.doneAt = new Date();
    }
    await tx.update(queueEntries).set(patch).where(and(eq(queueEntries.orgId, orgId), eq(queueEntries.id, entryId)));
    if (entry.status === "waiting") {
      const queue = await openQueue(tx, orgId);
      const next = waitingOrder(queue.map((r) => ({ id: r.entry.id, status: r.entry.status, joinedAt: r.entry.joinedAt.getTime(), durationMin: r.durationMin })))[0];
      const nextRow = next && queue.find((r) => r.entry.id === next.id);
      if (nextRow) {
        const [org] = await tx.select().from(orgs).where(eq(orgs.id, orgId));
        await messaging().send(tx, {
          orgId,
          customerId: nextRow.entry.customerId,
          channel: "whatsapp",
          purpose: "utility",
          template: "queue_next",
          toPhone: nextRow.customerPhone,
          body: `${nextRow.customerName.split(" ")[0]}, you are next at ${org.name}. Please be at the reception in about 5 minutes. ${appUrl()}/q/${org.qrToken}/t/${nextRow.entry.publicToken}`,
        });
      }
    }
    return { ok: true };
  });
}

const APPT_MOVES: Record<string, readonly string[]> = {
  booked: ["checked_in", "cancelled", "no_show"],
  checked_in: ["cancelled"],
};

export async function moveAppointment(db: DB, orgId: string, apptId: string, to: "checked_in" | "cancelled" | "no_show") {
  const [appt] = await db.select().from(appointments).where(and(eq(appointments.orgId, orgId), eq(appointments.id, apptId)));
  if (!appt) throw notFound("Appointment");
  if (!(APPT_MOVES[appt.status] ?? []).includes(to)) throw new StoreError(`Cannot move from ${appt.status} to ${to}`, 409);
  await db.update(appointments).set({ status: to }).where(and(eq(appointments.orgId, orgId), eq(appointments.id, apptId)));
  return { ok: true };
}

async function qrTokenOf(db: DB, orgId: string) {
  const [org] = await db.select({ t: orgs.qrToken }).from(orgs).where(eq(orgs.id, orgId));
  if (!org) throw notFound("Salon");
  return org.t;
}

/** Reception adds a walk-in who told staff their number (consent asked verbally, channel "staff"). */
export async function staffAddWalkIn(db: DB, orgId: string, input: Parameters<typeof joinQueue>[2]) {
  return joinQueue(db, await qrTokenOf(db, orgId), input);
}

/** Reception books a phone-in client into the diary, with the same overlap protection. */
export async function staffBook(db: DB, orgId: string, input: Parameters<typeof bookAppointment>[2]) {
  return bookAppointment(db, await qrTokenOf(db, orgId), input, new Date(), "phone");
}

export async function queueRowsForCustomer(db: DB, orgId: string, customerId: string) {
  return db.select().from(queueEntries).where(and(eq(queueEntries.orgId, orgId), eq(queueEntries.customerId, customerId), inArray(queueEntries.status, ["waiting", "in_chair"])));
}
