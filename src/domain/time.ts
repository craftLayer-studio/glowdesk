/** India Standard Time is UTC+5:30 all year (no daylight saving). */
export const IST_OFFSET_MINUTES = 330;
export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

/** Epoch ms of the most recent midnight in IST. */
export function startOfDayIST(now: number): number {
  const offsetMs = IST_OFFSET_MINUTES * MINUTE_MS;
  return Math.floor((now + offsetMs) / DAY_MS) * DAY_MS - offsetMs;
}

/** Epoch ms for a given IST calendar date ("YYYY-MM-DD") at `minuteOfDay` minutes after IST midnight. */
export function istDateTime(date: string, minuteOfDay: number): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`date must be YYYY-MM-DD, got ${date}`);
  const utcMidnight = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return utcMidnight - IST_OFFSET_MINUTES * MINUTE_MS + minuteOfDay * MINUTE_MS;
}

/** IST calendar date ("YYYY-MM-DD") of an instant. */
export function istDate(at: number): string {
  return new Date(at + IST_OFFSET_MINUTES * MINUTE_MS).toISOString().slice(0, 10);
}

/** Minutes after IST midnight of an instant. */
export function istMinuteOfDay(at: number): number {
  return Math.floor((at - startOfDayIST(at)) / MINUTE_MS);
}

/** "HH:MM" from minutes after midnight, e.g. 570 -> "09:30". */
export function formatMinuteOfDay(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Human time in IST, e.g. "Tue 25 Nov, 2:30 pm". */
export function formatIST(at: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
}

export function formatTimeIST(at: number): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(at);
}
