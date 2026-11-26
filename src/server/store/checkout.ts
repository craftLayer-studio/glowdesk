import { and, desc, eq, gt, gte, inArray, isNull, sql } from "drizzle-orm";
import { DAY_MS, formatINR, isRecovered, priceVisit, RECOVERY_WINDOW_DAYS, saleCommission, upiLink, type PaymentMethod } from "@/domain";
import type { Conn, DB } from "../db/client";
import {
  appointments,
  customerPackages,
  customers,
  membershipPlans,
  memberships,
  orgs,
  packages,
  queueEntries,
  rebookNudges,
  reviews,
  services,
  stylists,
  visitLines,
  visits,
} from "../db/schema";
import { messaging } from "../adapters/messaging";
import { appUrl } from "../config";
import { consentFor } from "./customers";
import { notFound, StoreError } from "./errors";
import { newId, newToken } from "./ids";

export interface CheckoutInput {
  customerId: string;
  stylistId: string;
  serviceIds: string[];
  method: PaymentMethod;
  appointmentId?: string;
  queueEntryId?: string;
}

async function loadContext(conn: Conn, orgId: string, input: CheckoutInput, now: Date) {
  if (input.serviceIds.length === 0 || input.serviceIds.length > 10) throw new StoreError("Add 1 to 10 services");
  const [[org], [customer], [stylist], menu] = await Promise.all([
    conn.select().from(orgs).where(eq(orgs.id, orgId)),
    conn.select().from(customers).where(and(eq(customers.orgId, orgId), eq(customers.id, input.customerId))),
    conn.select().from(stylists).where(and(eq(stylists.orgId, orgId), eq(stylists.id, input.stylistId))),
    conn.select().from(services).where(and(eq(services.orgId, orgId), inArray(services.id, input.serviceIds))),
  ]);
  if (!customer) throw notFound("Client");
  if (!stylist) throw notFound("Stylist");
  const lines = input.serviceIds.map((id) => {
    const s = menu.find((m) => m.id === id);
    if (!s) throw new StoreError("A service on this bill is not on the menu");
    return { serviceId: s.id, name: s.name, price: s.pricePaise, commissionOverridePercent: s.commissionOverridePercent, durationMin: s.durationMin };
  });
  const owned = await conn
    .select({ cp: customerPackages, serviceId: packages.serviceId, sessions: packages.sessions })
    .from(customerPackages)
    .innerJoin(packages, eq(packages.id, customerPackages.packageId))
    .where(and(eq(customerPackages.orgId, orgId), eq(customerPackages.customerId, customer.id), gt(customerPackages.sessionsLeft, 0), gt(customerPackages.expiresAt, now)));
  const [membership] = await conn
    .select()
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.customerId, customer.id), gt(memberships.expiresAt, now)))
    .orderBy(desc(memberships.expiresAt))
    .limit(1);
  const bill = priceVisit({
    services: lines,
    packages: owned.map((o) => ({ id: o.cp.id, serviceId: o.serviceId, sessionsLeft: o.cp.sessionsLeft, expiresAt: o.cp.expiresAt.getTime(), sessionValue: Math.round(o.cp.pricePaise / o.sessions) })),
    membership: membership ? { id: membership.id, discountPercent: membership.discountPercent, walletBalance: membership.walletBalancePaise, expiresAt: membership.expiresAt.getTime() } : null,
    gstPercent: org.gstPercent,
    rule: { type: stylist.commissionType, serviceValue: stylist.commissionValue, packagePercent: stylist.packagePercent },
    method: input.method,
    now: now.getTime(),
  });
  return { org, customer, stylist, bill, membership, serviceMinutes: lines.reduce((s, l) => s + l.durationMin, 0) };
}

function wrapBillError<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => {
    if (err instanceof Error && err.constructor.name === "BillError") throw new StoreError(err.message);
    throw err;
  });
}

/** Price a bill without saving (for the checkout preview). Server-side prices only. */
export async function previewCheckout(db: DB, orgId: string, input: CheckoutInput, now = new Date()) {
  return wrapBillError(async () => (await loadContext(db, orgId, input, now)).bill);
}

/**
 * Close a visit: save the bill and lines, use package sessions, debit the wallet,
 * close the appointment or queue entry, credit any open rebooking nudge as recovered,
 * and send the bill plus a review request (if the client allowed service updates).
 */
export async function checkout(db: DB, orgId: string, input: CheckoutInput, now = new Date()) {
  return wrapBillError(() =>
    db.transaction(async (tx) => {
      const { org, customer, stylist, bill, membership, serviceMinutes } = await loadContext(tx, orgId, input, now);
      if (input.appointmentId) {
        const [a] = await tx.select().from(appointments).where(and(eq(appointments.orgId, orgId), eq(appointments.id, input.appointmentId)));
        if (!a || a.customerId !== customer.id) throw notFound("Appointment");
        if (!["booked", "checked_in"].includes(a.status)) throw new StoreError("This appointment is already closed", 409);
        await tx.update(appointments).set({ status: "completed" }).where(and(eq(appointments.orgId, orgId), eq(appointments.id, a.id)));
      }
      if (input.queueEntryId) {
        const [q] = await tx.select().from(queueEntries).where(and(eq(queueEntries.orgId, orgId), eq(queueEntries.id, input.queueEntryId)));
        if (!q || q.customerId !== customer.id) throw notFound("Queue entry");
        if (q.status !== "in_chair") throw new StoreError("Start this client before checkout", 409);
        await tx.update(queueEntries).set({ status: "done", doneAt: now }).where(and(eq(queueEntries.orgId, orgId), eq(queueEntries.id, q.id)));
      }
      const [{ n }] = await tx.select({ n: sql<number>`coalesce(max(${visits.billNo}), 0)::int` }).from(visits).where(eq(visits.orgId, orgId));
      const visitId = newId();
      await tx.insert(visits).values({
        id: visitId,
        orgId,
        customerId: customer.id,
        stylistId: stylist.id,
        appointmentId: input.appointmentId ?? null,
        queueEntryId: input.queueEntryId ?? null,
        subtotal: bill.subtotal,
        discount: bill.discount,
        taxable: bill.taxable,
        gst: bill.gst,
        total: bill.total,
        commission: bill.commission,
        serviceMinutes,
        paymentMethod: input.method,
        billNo: n + 1,
        createdAt: now,
      });
      await tx.insert(visitLines).values(bill.lines.map((l) => ({ id: newId(), orgId, visitId, ...l })));
      for (const [cpId, used] of Object.entries(bill.packageUses)) {
        await tx
          .update(customerPackages)
          .set({ sessionsLeft: sql`${customerPackages.sessionsLeft} - ${used}` })
          .where(and(eq(customerPackages.orgId, orgId), eq(customerPackages.id, cpId)));
      }
      if (bill.walletDebit > 0 && membership) {
        await tx
          .update(memberships)
          .set({ walletBalancePaise: sql`${memberships.walletBalancePaise} - ${bill.walletDebit}` })
          .where(and(eq(memberships.orgId, orgId), eq(memberships.id, membership.id)));
      }
      // Recovered revenue: the latest unconverted nudge sent within the window.
      const windowStart = new Date(now.getTime() - RECOVERY_WINDOW_DAYS * DAY_MS);
      const [nudge] = await tx
        .select()
        .from(rebookNudges)
        .where(and(eq(rebookNudges.orgId, orgId), eq(rebookNudges.customerId, customer.id), isNull(rebookNudges.bookedVisitId), gte(rebookNudges.sentAt, windowStart)))
        .orderBy(desc(rebookNudges.sentAt))
        .limit(1);
      let recovered = 0;
      if (nudge && isRecovered(nudge.sentAt.getTime(), now.getTime())) {
        recovered = bill.total;
        await tx.update(rebookNudges).set({ bookedVisitId: visitId, recoveredPaise: recovered }).where(and(eq(rebookNudges.orgId, orgId), eq(rebookNudges.id, nudge.id)));
      }
      const consent = (await consentFor(tx, orgId, [customer.id])).get(customer.id)!;
      const reviewToken = newToken();
      await tx.insert(reviews).values({ id: newId(), orgId, visitId, customerId: customer.id, token: reviewToken, requestedAt: now });
      if (consent.service_updates) {
        await messaging().send(tx, {
          orgId,
          customerId: customer.id,
          channel: "whatsapp",
          purpose: "utility",
          template: "bill_and_review",
          toPhone: customer.phone,
          body: `Thank you for visiting ${org.name}, ${customer.name.split(" ")[0]}. Bill #${n + 1}: ${formatINR(bill.total)} paid by ${input.method.toUpperCase()}. How was your visit with ${stylist.name}? Rate us: ${appUrl()}/r/${reviewToken}`,
        });
      }
      return {
        visitId,
        billNo: n + 1,
        bill,
        recoveredPaise: recovered,
        reviewUrl: `${appUrl()}/r/${reviewToken}`,
        upiLink: input.method === "upi" && org.upiVpa ? upiLink({ vpa: org.upiVpa, payeeName: org.name, amount: bill.total, note: `Bill ${n + 1}` }) : null,
      };
    }),
  );
}

/** Sell a package (prepaid sessions) or a membership (wallet credit + discount) to a client. */
export async function sellPlan(
  db: DB,
  orgId: string,
  input: { customerId: string; kind: "package" | "membership"; planId: string; stylistId?: string; method: Exclude<PaymentMethod, "wallet"> },
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(and(eq(customers.orgId, orgId), eq(customers.id, input.customerId)));
    if (!customer) throw notFound("Client");
    let seller = null;
    if (input.stylistId) {
      [seller] = await tx.select().from(stylists).where(and(eq(stylists.orgId, orgId), eq(stylists.id, input.stylistId)));
      if (!seller) throw notFound("Stylist");
    }
    const rule = seller ? { type: seller.commissionType, serviceValue: seller.commissionValue, packagePercent: seller.packagePercent } : null;
    if (input.kind === "package") {
      const [p] = await tx.select().from(packages).where(and(eq(packages.orgId, orgId), eq(packages.id, input.planId), eq(packages.active, true)));
      if (!p) throw notFound("Package");
      const id = newId();
      await tx.insert(customerPackages).values({
        id,
        orgId,
        customerId: customer.id,
        packageId: p.id,
        sessionsLeft: p.sessions,
        expiresAt: new Date(now.getTime() + p.validityDays * DAY_MS),
        soldByStylistId: seller?.id ?? null,
        pricePaise: p.pricePaise,
        commission: rule ? saleCommission(rule, p.pricePaise) : 0,
        paymentMethod: input.method,
        createdAt: now,
      });
      return { id, pricePaise: p.pricePaise };
    }
    const [plan] = await tx.select().from(membershipPlans).where(and(eq(membershipPlans.orgId, orgId), eq(membershipPlans.id, input.planId), eq(membershipPlans.active, true)));
    if (!plan) throw notFound("Membership plan");
    const id = newId();
    await tx.insert(memberships).values({
      id,
      orgId,
      customerId: customer.id,
      planId: plan.id,
      walletBalancePaise: plan.walletCreditPaise,
      discountPercent: plan.discountPercent,
      expiresAt: new Date(now.getTime() + plan.validityDays * DAY_MS),
      soldByStylistId: seller?.id ?? null,
      pricePaise: plan.pricePaise,
      commission: rule ? saleCommission(rule, plan.pricePaise) : 0,
      paymentMethod: input.method,
      createdAt: now,
    });
    return { id, pricePaise: plan.pricePaise };
  });
}
