const HOUR_MS = 3_600_000;

export type ReminderKind = "24h" | "2h";

/**
 * Which booking reminder (WhatsApp utility template) is due now, if any.
 * 24 hours and 2 hours before the start. A reminder is skipped when the booking
 * was made inside its window (the confirmation already covers it).
 */
export function reminderDue(input: { startAt: number; createdAt: number; now: number; reminded24: boolean; reminded2: boolean }): ReminderKind | null {
  const { startAt, createdAt, now } = input;
  if (now >= startAt) return null;
  if (now >= startAt - 2 * HOUR_MS) {
    return !input.reminded2 && createdAt < startAt - 2 * HOUR_MS ? "2h" : null;
  }
  if (now >= startAt - 24 * HOUR_MS) {
    return !input.reminded24 && createdAt < startAt - 24 * HOUR_MS ? "24h" : null;
  }
  return null;
}
