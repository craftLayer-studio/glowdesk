export type QueueStatus = "waiting" | "in_chair" | "done" | "left";

export interface QueueItem {
  id: string;
  status: QueueStatus;
  joinedAt: number;
  durationMin: number;
}

const TRANSITIONS: Record<QueueStatus, readonly QueueStatus[]> = {
  waiting: ["in_chair", "left"],
  in_chair: ["done", "left"],
  done: [],
  left: [],
};

export function canMoveQueue(from: QueueStatus, to: QueueStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Waiting entries in turn order (first come, first served). */
export function waitingOrder<T extends QueueItem>(items: readonly T[]): T[] {
  return items
    .filter((i) => i.status === "waiting")
    .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
}

export interface QueuePosition {
  /** 1-based place in line, or null when not waiting. */
  position: number | null;
  /** Estimated minutes until this client is called (estimate). */
  etaMin: number | null;
}

/**
 * Position of `id` in the walk-in line and a rough wait estimate:
 * total service minutes of everyone ahead, shared across the stylists on the floor.
 */
export function queuePosition(items: readonly QueueItem[], id: string, stylistsOnFloor: number): QueuePosition {
  const line = waitingOrder(items);
  const idx = line.findIndex((i) => i.id === id);
  if (idx === -1) return { position: null, etaMin: null };
  const aheadMinutes = line.slice(0, idx).reduce((sum, i) => sum + i.durationMin, 0);
  const inChairMinutes = items.filter((i) => i.status === "in_chair").reduce((s, i) => s + i.durationMin, 0) / 2;
  const chairs = Math.max(1, stylistsOnFloor);
  return { position: idx + 1, etaMin: Math.round((aheadMinutes + inChairMinutes) / chairs) };
}
