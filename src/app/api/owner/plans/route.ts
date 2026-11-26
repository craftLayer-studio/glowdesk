import { getDb } from "@/server/db/client";
import { handle, int, oneOf, readBody, str } from "@/server/http";
import { requireRole } from "@/server/session";
import { createMembershipPlan, createPackage } from "@/server/store";

/** Create a package (prepaid sessions of one service) or a membership plan (wallet + discount). */
export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireRole("owner");
    const b = await readBody(request);
    const db = await getDb();
    if (oneOf(b, "kind", ["package", "membership"] as const) === "package") {
      return createPackage(db, s.orgId, {
        name: str(b, "name", 80),
        serviceId: str(b, "serviceId", 64),
        sessions: int(b, "sessions", 2, 50),
        pricePaise: int(b, "pricePaise", 1, 10_000_000),
        validityDays: int(b, "validityDays", 7, 730),
      });
    }
    return createMembershipPlan(db, s.orgId, {
      name: str(b, "name", 80),
      pricePaise: int(b, "pricePaise", 1, 10_000_000),
      walletCreditPaise: int(b, "walletCreditPaise", 0, 10_000_000),
      discountPercent: int(b, "discountPercent", 0, 50),
      validityDays: int(b, "validityDays", 30, 730),
    });
  });
}
