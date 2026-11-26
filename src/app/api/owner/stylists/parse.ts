import { bool, int, oneOf, str, text } from "@/server/http";
import type { StylistInput } from "@/server/store";

export function parseStylist(b: Record<string, unknown>): StylistInput {
  return {
    name: str(b, "name", 60),
    phone: text(b, "phone", 20),
    title: text(b, "title", 60),
    commissionType: oneOf(b, "commissionType", ["percent", "flat"] as const),
    commissionValue: int(b, "commissionValue", 0, 10_000_000),
    packagePercent: int(b, "packagePercent", 0, 100),
    active: b.active === undefined ? true : bool(b, "active"),
  };
}
