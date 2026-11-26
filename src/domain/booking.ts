import { MINUTE_MS, istDateTime } from "./time";

export interface Interval {
  start: number;
  end: number;
}

/** Half-open intervals [start, end) overlap when each starts before the other ends. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function conflictsWith(candidate: Interval, busy: readonly Interval[]): boolean {
  return busy.some((b) => overlaps(candidate, b));
}

export interface SlotInput {
  /** IST calendar date "YYYY-MM-DD". */
  date: string;
  openMinute: number;
  closeMinute: number;
  durationMin: number;
  /** The stylist's existing bookings (non-cancelled). */
  busy: readonly Interval[];
  now: number;
  stepMin?: number;
  /** Minimum minutes from now before a slot can start. */
  leadMin?: number;
}

/** Start times (epoch ms) a stylist can take a booking of `durationMin` on `date`. */
export function availableSlots(input: SlotInput): number[] {
  const step = input.stepMin ?? 15;
  const lead = input.leadMin ?? 15;
  const out: number[] = [];
  for (let m = input.openMinute; m + input.durationMin <= input.closeMinute; m += step) {
    const start = istDateTime(input.date, m);
    const slot = { start, end: start + input.durationMin * MINUTE_MS };
    if (start < input.now + lead * MINUTE_MS) continue;
    if (conflictsWith(slot, input.busy)) continue;
    out.push(start);
  }
  return out;
}

export type BookingProblem = "outside_hours" | "in_past" | "overlap" | "bad_duration";

/** Validate a requested booking against opening hours and the stylist's diary. */
export function checkBooking(input: {
  start: number;
  durationMin: number;
  date: string;
  openMinute: number;
  closeMinute: number;
  busy: readonly Interval[];
  now: number;
}): BookingProblem | null {
  if (!Number.isInteger(input.durationMin) || input.durationMin <= 0) return "bad_duration";
  const open = istDateTime(input.date, input.openMinute);
  const close = istDateTime(input.date, input.closeMinute);
  const end = input.start + input.durationMin * MINUTE_MS;
  if (input.start < open || end > close) return "outside_hours";
  if (input.start < input.now) return "in_past";
  if (conflictsWith({ start: input.start, end }, input.busy)) return "overlap";
  return null;
}
