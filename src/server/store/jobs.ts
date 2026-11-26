import { and, eq, gte, lt } from "drizzle-orm";
import { DAY_MS, formatINR, formatIST, reminderDue, startOfDayIST } from "@/domain";
import type { DB } from "../db/client";
import { appointments, customers, orgs, rebookNudges, services, stylists, users, visits } from "../db/schema";
import { messaging } from "../adapters/messaging";
import { appUrl } from "../config";
import { consentFor } from "./customers";
import { dueList, runNudges } from "./nudges";

/** Booking reminders 24 h and 2 h before (utility template, needs service-update consent). Idempotent. */
export async function runReminders(db: DB, orgId: string, now = new Date()) {
  const t = now.getTime();
  const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId));
  const rows = await db
    .select({ a: appointments, name: customers.name, phone: customers.phone, serviceName: services.name, stylistName: stylists.name })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(stylists, eq(stylists.id, appointments.stylistId))
    .where(and(eq(appointments.orgId, orgId), eq(appointments.status, "booked"), gte(appointments.startAt, now), lt(appointments.startAt, new Date(t + DAY_MS))));
  const consent = await consentFor(db, orgId, rows.map((r) => r.a.customerId));
  let sent = 0;
  for (const r of rows) {
    const kind = reminderDue({ startAt: r.a.startAt.getTime(), createdAt: r.a.createdAt.getTime(), now: t, reminded24: r.a.reminded24At !== null, reminded2: r.a.reminded2At !== null });
    if (!kind || !consent.get(r.a.customerId)?.service_updates) continue;
    await db.transaction(async (tx) => {
      await messaging().send(tx, {
        orgId,
        customerId: r.a.customerId,
        channel: "whatsapp",
        purpose: "utility",
        template: `booking_reminder_${kind}`,
        toPhone: r.phone,
        body: `Reminder: ${r.serviceName} with ${r.stylistName} at ${org.name}, ${formatIST(r.a.startAt.getTime())}. Need to change it? ${appUrl()}/q/${org.qrToken}/b/${r.a.publicToken}`,
      });
      await tx
        .update(appointments)
        .set(kind === "24h" ? { reminded24At: now } : { reminded2At: now })
        .where(and(eq(appointments.orgId, orgId), eq(appointments.id, r.a.id)));
    });
    sent += 1;
  }
  return { sent };
}

/** The owner's morning WhatsApp summary: today's bookings, clients due this week, yesterday's revenue and recovered revenue. */
export async function sendOwnerSummary(db: DB, orgId: string, now = new Date()) {
  const t = now.getTime();
  const today = startOfDayIST(t);
  const [[org], owners, todays, yesterday, recovered, due] = await Promise.all([
    db.select().from(orgs).where(eq(orgs.id, orgId)),
    db.select().from(users).where(and(eq(users.orgId, orgId), eq(users.role, "owner"))),
    db.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.orgId, orgId), eq(appointments.status, "booked"), gte(appointments.startAt, new Date(today)), lt(appointments.startAt, new Date(today + DAY_MS)))),
    db.select({ total: visits.total }).from(visits).where(and(eq(visits.orgId, orgId), gte(visits.createdAt, new Date(today - DAY_MS)), lt(visits.createdAt, new Date(today)))),
    db.select({ p: rebookNudges.recoveredPaise }).from(rebookNudges).where(and(eq(rebookNudges.orgId, orgId), gte(rebookNudges.sentAt, new Date(today - 30 * DAY_MS)))),
    dueList(db, orgId, t, 7),
  ]);
  const yRevenue = yesterday.reduce((s, v) => s + v.total, 0);
  const rec = recovered.reduce((s, n) => s + n.p, 0);
  const body = `Good morning from GlowDesk. ${org.name}: ${todays.length} bookings today. ${due.length} clients due this week. Yesterday: ${formatINR(yRevenue)} from ${yesterday.length} visits. Recovered by nudges (30 days): ${formatINR(rec)}.`;
  for (const o of owners) {
    await messaging().send(db, { orgId, customerId: null, channel: "whatsapp", purpose: "utility", template: "owner_daily_summary", toPhone: o.phone, body });
  }
  return { sent: owners.length, body };
}

/** Everything a daily cron would run. Each part is safe to repeat. */
export async function runJobs(db: DB, orgId: string, now = new Date()) {
  const [reminders, nudges] = [await runReminders(db, orgId, now), await runNudges(db, orgId, now)];
  return { reminders: reminders.sent, nudges: nudges.sent };
}
