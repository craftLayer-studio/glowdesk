import { describe, expect, it } from "vitest";
import { canMoveQueue, queuePosition, waitingOrder, type QueueItem } from "./queue";

const items: QueueItem[] = [
  { id: "c", status: "waiting", joinedAt: 30, durationMin: 30 },
  { id: "a", status: "waiting", joinedAt: 10, durationMin: 20 },
  { id: "x", status: "in_chair", joinedAt: 5, durationMin: 40 },
  { id: "b", status: "waiting", joinedAt: 20, durationMin: 40 },
  { id: "d", status: "left", joinedAt: 1, durationMin: 30 },
];

describe("walk-in queue", () => {
  it("orders the waiting line first come, first served", () => {
    expect(waitingOrder(items).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
  it("gives a position and a wait estimate shared across stylists", () => {
    expect(queuePosition(items, "a", 2)).toEqual({ position: 1, etaMin: 10 });
    expect(queuePosition(items, "c", 2)).toEqual({ position: 3, etaMin: 40 });
    expect(queuePosition(items, "x", 2)).toEqual({ position: null, etaMin: null });
  });
  it("only allows forward moves", () => {
    expect(canMoveQueue("waiting", "in_chair")).toBe(true);
    expect(canMoveQueue("done", "waiting")).toBe(false);
    expect(canMoveQueue("waiting", "done")).toBe(false);
  });
});
