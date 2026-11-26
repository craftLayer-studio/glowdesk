import { DAY_MS } from "./time";

/** Days after a nudge in which a visit counts as recovered revenue. */
export const RECOVERY_WINDOW_DAYS = 14;
/** Days after the first nudge before one follow-up is sent. */
export const FOLLOW_UP_AFTER_DAYS = 7;
/** Marketing messages allowed per client per rolling 30 days. */
export const MAX_MARKETING_PER_30_DAYS = 2;

export interface LastServiceVisit {
  customerId: string;
  serviceId: string;
  visitId: string;
  visitedAt: number;
  cycleDays: number;
}

export interface PriorNudge {
  customerId: string;
  serviceId: string;
  lastVisitId: string;
  kind: "first" | "follow_up";
  sentAt: number;
  converted: boolean;
}

export interface NudgePlan {
  customerId: string;
  serviceId: string;
  lastVisitId: string;
  kind: "first" | "follow_up";
  dueAt: number;
}

/**
 * Decide which rebooking nudges to send now.
 * - "first" when the service cycle has elapsed since the client's last visit for that service
 *   and no nudge was sent for that visit yet.
 * - "follow_up" once, 7+ days after an unconverted first nudge for the same visit.
 * - Only clients with marketing consent; at most 2 marketing messages per rolling 30 days;
 *   clients with an upcoming booking are skipped.
 */
export function planNudges(input: {
  lastVisits: readonly LastServiceVisit[];
  nudges: readonly PriorNudge[];
  marketingOptIn: ReadonlySet<string>;
  /** Marketing messages already sent per customer in the last 30 days. */
  marketingSent30d: ReadonlyMap<string, number>;
  hasUpcomingBooking: ReadonlySet<string>;
  now: number;
}): NudgePlan[] {
  const plans: NudgePlan[] = [];
  const planned = new Map<string, number>();
  const sorted = [...input.lastVisits].sort((a, b) => a.visitedAt - b.visitedAt);
  for (const v of sorted) {
    if (v.cycleDays <= 0) continue;
    if (!input.marketingOptIn.has(v.customerId)) continue;
    if (input.hasUpcomingBooking.has(v.customerId)) continue;
    const used = (input.marketingSent30d.get(v.customerId) ?? 0) + (planned.get(v.customerId) ?? 0);
    if (used >= MAX_MARKETING_PER_30_DAYS) continue;
    const forVisit = input.nudges.filter((n) => n.lastVisitId === v.visitId && n.serviceId === v.serviceId);
    const dueAt = v.visitedAt + v.cycleDays * DAY_MS;
    let plan: NudgePlan | null = null;
    if (forVisit.length === 0) {
      if (input.now >= dueAt) plan = { customerId: v.customerId, serviceId: v.serviceId, lastVisitId: v.visitId, kind: "first", dueAt };
    } else {
      const first = forVisit.find((n) => n.kind === "first");
      const hasFollowUp = forVisit.some((n) => n.kind === "follow_up");
      if (first && !hasFollowUp && !first.converted && input.now >= first.sentAt + FOLLOW_UP_AFTER_DAYS * DAY_MS) {
        plan = { customerId: v.customerId, serviceId: v.serviceId, lastVisitId: v.visitId, kind: "follow_up", dueAt: first.sentAt + FOLLOW_UP_AFTER_DAYS * DAY_MS };
      }
    }
    if (plan) {
      plans.push(plan);
      planned.set(v.customerId, (planned.get(v.customerId) ?? 0) + 1);
    }
  }
  return plans;
}

/** A visit recovers a nudge when it happens within the recovery window after the nudge was sent. */
export function isRecovered(nudgeSentAt: number, visitAt: number): boolean {
  return visitAt >= nudgeSentAt && visitAt <= nudgeSentAt + RECOVERY_WINDOW_DAYS * DAY_MS;
}

/** Message text for a rebooking nudge (WhatsApp marketing template, simulated). */
export function nudgeMessage(input: {
  clientName: string;
  serviceName: string;
  stylistName: string | null;
  weeksSince: number;
  salonName: string;
  link: string;
  kind: "first" | "follow_up";
  offer: string | null;
}): string {
  const first = input.clientName.split(" ")[0];
  if (input.kind === "follow_up") {
    const offer = input.offer ? ` ${input.offer}.` : "";
    return `Hi ${first}, still want that ${input.serviceName.toLowerCase()} at ${input.salonName}?${offer} Book in 30 seconds: ${input.link} Reply STOP to opt out.`;
  }
  const withWho = input.stylistName ? ` with ${input.stylistName}` : "";
  return `Hi ${first}, it has been ${input.weeksSince} weeks since your ${input.serviceName.toLowerCase()}${withWho} at ${input.salonName}. Time for your next one? Book your slot: ${input.link} Reply STOP to opt out.`;
}
