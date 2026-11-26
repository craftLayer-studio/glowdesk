import { bool, int, oneOf, optInt, str } from "@/server/http";
import type { ServiceInput } from "@/server/store";

export function parseService(b: Record<string, unknown>): ServiceInput {
  return {
    name: str(b, "name", 80),
    category: str(b, "category", 40),
    gender: oneOf(b, "gender", ["women", "men", "unisex"] as const),
    pricePaise: int(b, "pricePaise", 0, 10_000_000),
    durationMin: int(b, "durationMin", 5, 480),
    cycleDays: int(b, "cycleDays", 0, 365),
    commissionOverridePercent: optInt(b, "commissionOverridePercent", 0, 100),
    active: b.active === undefined ? true : bool(b, "active"),
  };
}
