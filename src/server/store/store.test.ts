import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { DAY_MS, istDate, istDateTime } from "@/domain";
import { createMemoryDb, type DB } from "../db/client";
import * as t from "../db/schema";
import { DEMO, seedDemo } from "../db/seed";
import {
  bookAppointment,
  checkout,
  clientDetail,
  dashboard,
  floor,
  joinQueue,
  moveQueue,
  previewCheckout,
  publicSalon,
  requestOtp,
  runNudges,
  sellPlan,
  slots,
  StoreError,
  submitReview,
  ticketStatus,
  verifyOtp,
  optOutByToken,
  dueList,
  runReminders,
  sendOwnerSummary,
} from ".";

let db: DB;
let orgId: string;

beforeAll(async () => {
  db = await createMemoryDb();
  ({ orgId } = await seedDemo(db));
}, 60_000);

const tomorrow = () => istDate(Date.now() + DAY_MS);

describe("public QR page", () => {
  it("shows the menu, team and current wait", async () => {
    const s = await publicSalon(db, DEMO.qrToken);
    expect(s.salon.isDemo).toBe(true);
    expect(s.services.length).toBeGreaterThan(5);
    expect(s.queue.waiting).toBe(3);
  });
  it("rejects unknown QR tokens", async () => {
    await expect(publicSalon(db, "nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("walk-in queue", () => {
  it("requires service-update consent and a valid phone", async () => {
    const s = await publicSalon(db, DEMO.qrToken);
    const base = { name: "Test Client", phone: "98111 22334", serviceId: s.services[0].id, consentServiceUpdates: true, consentMarketing: false };
    await expect(joinQueue(db, DEMO.qrToken, { ...base, consentServiceUpdates: false })).rejects.toBeInstanceOf(StoreError);
    await expect(joinQueue(db, DEMO.qrToken, { ...base, phone: "12345" })).rejects.toBeInstanceOf(StoreError);
  });

  it("joins, shows live position, notifies on WhatsApp outbox and records consent", async () => {
    const s = await publicSalon(db, DEMO.qrToken);
    const { ticketToken } = await joinQueue(db, DEMO.qrToken, { name: "Farah Khan", phone: "+91 90000 11111", serviceId: s.services[0].id, consentServiceUpdates: true, consentMarketing: true });
    const ticket = await ticketStatus(db, DEMO.qrToken, ticketToken);
    expect(ticket.position).toBe(4);
    expect(ticket.marketingOptIn).toBe(true);
    const [c] = await db.select().from(t.customers).where(and(eq(t.customers.orgId, orgId), eq(t.customers.phone, "+919000011111")));
    const consents = await db.select().from(t.consentRecords).where(eq(t.consentRecords.customerId, c.id));
    expect(consents.map((r) => r.purpose).sort()).toEqual(["marketing", "service_updates"]);
    const msgs = await db.select().from(t.outbox).where(eq(t.outbox.customerId, c.id));
    expect(msgs[0].template).toBe("queue_joined");
    // Joining twice returns the same ticket.
    const again = await joinQueue(db, DEMO.qrToken, { name: "Farah Khan", phone: "9000011111", serviceId: s.services[0].id, consentServiceUpdates: true, consentMarketing: false });
    expect(again).toEqual({ ticketToken, existing: true });
    // Opt-out works from the ticket link.
    await optOutByToken(db, DEMO.qrToken, ticketToken);
    expect((await ticketStatus(db, DEMO.qrToken, ticketToken)).marketingOptIn).toBe(false);
  });

  it("moves people up when staff start the next client", async () => {
    const f = await floor(db, orgId);
    const first = f.queue.find((q) => q.position === 1)!;
    await moveQueue(db, orgId, first.id, "in_chair", f.stylists[0].id);
    const f2 = await floor(db, orgId);
    expect(f2.queue.find((q) => q.id === first.id)!.status).toBe("in_chair");
    expect(f2.queue.filter((q) => q.status === "waiting").map((q) => q.position)).toEqual([1, 2, 3]);
    await expect(moveQueue(db, orgId, first.id, "waiting")).rejects.toMatchObject({ status: 409 });
  });
});

describe("booking", () => {
  it("never lets two bookings overlap for the same stylist", async () => {
    const s = await publicSalon(db, DEMO.qrToken);
    const svc = s.services.find((x) => x.durationMin === 45)!;
    const stylist = s.stylists[0];
    const date = tomorrow();
    const start = istDateTime(date, 11 * 60);
    const input = { name: "Ira Desai", phone: "9000022222", serviceId: svc.id, stylistId: stylist.id, startAt: start, consentServiceUpdates: true, consentMarketing: false };
    await bookAppointment(db, DEMO.qrToken, input);
    await expect(bookAppointment(db, DEMO.qrToken, { ...input, phone: "9000033333", startAt: start + 30 * 60_000 })).rejects.toMatchObject({ status: 409 });
    // Concurrent attempts at the same slot: exactly one wins.
    const later = istDateTime(date, 15 * 60);
    const results = await Promise.allSettled([
      bookAppointment(db, DEMO.qrToken, { ...input, phone: "9000044444", startAt: later }),
      bookAppointment(db, DEMO.qrToken, { ...input, phone: "9000055555", startAt: later }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    // Another stylist can take the same time.
    await bookAppointment(db, DEMO.qrToken, { ...input, phone: "9000066666", stylistId: s.stylists[1].id });
    const free = await slots(db, DEMO.qrToken, svc.id, stylist.id, date);
    expect(free.slots).not.toContain(start);
    expect(free.slots).not.toContain(start + 15 * 60_000);
  });

  it("rejects times outside opening hours", async () => {
    const s = await publicSalon(db, DEMO.qrToken);
    const input = { name: "Ira Desai", phone: "9000022222", serviceId: s.services[0].id, stylistId: s.stylists[0].id, startAt: istDateTime(tomorrow(), 7 * 60), consentServiceUpdates: true, consentMarketing: false };
    await expect(bookAppointment(db, DEMO.qrToken, input)).rejects.toMatchObject({ message: "That time is outside opening hours" });
  });
});

describe("checkout, packages and memberships", () => {
  it("bills from server prices with GST and commission, closes the queue entry, requests a review", async () => {
    const f = await floor(db, orgId);
    const inChair = f.queue.find((q) => q.status === "in_chair")!;
    const preview = await previewCheckout(db, orgId, { customerId: inChair.customerId, stylistId: inChair.stylistId!, serviceIds: [inChair.serviceId], method: "upi" });
    const res = await checkout(db, orgId, { customerId: inChair.customerId, stylistId: inChair.stylistId!, serviceIds: [inChair.serviceId], method: "upi", queueEntryId: inChair.id });
    expect(res.bill.total).toBe(preview.total);
    expect(res.bill.gst).toBe(Math.round((res.bill.taxable * 18) / 100));
    expect(res.bill.commission).toBeGreaterThan(0);
    expect(res.upiLink).toMatch(/^upi:\/\/pay\?/);
    const [q] = await db.select().from(t.queueEntries).where(eq(t.queueEntries.id, inChair.id));
    expect(q.status).toBe("done");
    const token = res.reviewUrl.split("/r/")[1];
    const happy = await submitReview(db, token, 5, "Great");
    expect(happy.route).toBe("google");
    await expect(submitReview(db, token, 1, "again")).rejects.toMatchObject({ status: 409 });
  });

  it("redeems package sessions and wallet balance", async () => {
    const [plan] = await db.select().from(t.packages).where(and(eq(t.packages.orgId, orgId), eq(t.packages.name, "Beard club (4 trims)")));
    const [gold] = await db.select().from(t.membershipPlans).where(eq(t.membershipPlans.orgId, orgId));
    const [client] = await db.select().from(t.customers).where(eq(t.customers.phone, "+919000022222"));
    const [stylist] = await db.select().from(t.stylists).where(eq(t.stylists.orgId, orgId));
    await sellPlan(db, orgId, { customerId: client.id, kind: "package", planId: plan.id, stylistId: stylist.id, method: "cash" });
    await sellPlan(db, orgId, { customerId: client.id, kind: "membership", planId: gold.id, method: "upi" });
    const res = await checkout(db, orgId, { customerId: client.id, stylistId: stylist.id, serviceIds: [plan.serviceId, plan.serviceId], method: "wallet" });
    expect(res.bill.total).toBe(0);
    const d = await clientDetail(db, orgId, client.id);
    expect(d.packages[0].sessionsLeft).toBe(2);
    expect(d.memberships[0].walletBalance).toBe(gold.walletCreditPaise);
    await expect(checkout(db, orgId, { customerId: "nope", stylistId: stylist.id, serviceIds: [plan.serviceId], method: "cash" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("rebooking nudges", () => {
  it("sends due nudges only to opted-in clients, at most once per visit, and credits recovered revenue", async () => {
    const due = await dueList(db, orgId);
    expect(due.length).toBeGreaterThan(0);
    const first = await runNudges(db, orgId);
    expect(first.sent).toBeGreaterThan(0);
    const again = await runNudges(db, orgId);
    expect(again.sent).toBe(0);
    const nudges = await db.select().from(t.rebookNudges).where(eq(t.rebookNudges.orgId, orgId));
    const fresh = nudges.find((n) => n.bookedVisitId === null)!;
    const consent = await db.select().from(t.consentRecords).where(and(eq(t.consentRecords.customerId, fresh.customerId), eq(t.consentRecords.purpose, "marketing")));
    expect(consent.at(-1)?.granted).toBe(true);
    const [stylist] = await db.select().from(t.stylists).where(eq(t.stylists.orgId, orgId));
    const res = await checkout(db, orgId, { customerId: fresh.customerId, stylistId: stylist.id, serviceIds: [fresh.serviceId], method: "cash" });
    expect(res.recoveredPaise).toBe(res.bill.total);
    // Follow-up a week later, for those who did not come back.
    const later = await runNudges(db, orgId, new Date(Date.now() + 8 * DAY_MS));
    expect(later.sent).toBeGreaterThan(0);
  });
});

describe("dashboard and auth", () => {
  it("reports utilisation, revenue by stylist and repeat rate", async () => {
    const d = await dashboard(db, orgId, 30);
    expect(d.revenue).toBeGreaterThan(0);
    expect(d.chairUtilisation).toBeGreaterThan(0);
    expect(d.chairUtilisation).toBeLessThanOrEqual(1);
    expect(d.repeatRate).toBeGreaterThan(0.3);
    expect(d.byStylist).toHaveLength(4);
    expect(d.nudges.recoveredPaise).toBeGreaterThan(0);
  });
  it("signs staff in with a one-time code", async () => {
    const r = await requestOtp(db, DEMO.ownerPhone, { demo: true });
    await expect(verifyOtp(db, DEMO.ownerPhone, "000000" === r.demoCode ? "111111" : "000000")).rejects.toMatchObject({ status: 401 });
    const s = await verifyOtp(db, DEMO.ownerPhone, r.demoCode!);
    expect(s.role).toBe("owner");
    await expect(verifyOtp(db, DEMO.ownerPhone, r.demoCode!)).rejects.toMatchObject({ status: 401 });
    expect((await requestOtp(db, "9999999999", { demo: true })).demoCode).toBeNull();
  });
});

describe("booking reminders and owner summary", () => {
  it("sends the 2-hour reminder once, only to clients with service-update consent", async () => {
    const s = await publicSalon(db, DEMO.qrToken);
    const svc = s.services[0];
    const start = istDateTime(tomorrow(), 17 * 60);
    const { bookingToken } = await bookAppointment(db, DEMO.qrToken, { name: "Reena Kapoor", phone: "9000077777", serviceId: svc.id, stylistId: s.stylists[3].id, startAt: start, consentServiceUpdates: true, consentMarketing: false });
    const at = new Date(start - 60 * 60_000);
    const first = await runReminders(db, orgId, at);
    expect(first.sent).toBeGreaterThanOrEqual(1);
    expect((await runReminders(db, orgId, at)).sent).toBe(0);
    const [appt] = await db.select().from(t.appointments).where(eq(t.appointments.publicToken, bookingToken));
    expect(appt.reminded2At).not.toBeNull();
  });
  it("writes the owner's daily summary to the outbox", async () => {
    const r = await sendOwnerSummary(db, orgId);
    expect(r.sent).toBe(1);
    expect(r.body).toContain("bookings today");
    const msgs = await db.select().from(t.outbox).where(and(eq(t.outbox.orgId, orgId), eq(t.outbox.template, "owner_daily_summary")));
    expect(msgs[0].toPhone).toBe(DEMO.ownerPhone);
  });
});
