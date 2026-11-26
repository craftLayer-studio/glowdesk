import { getDb } from "@/server/db/client";
import { handle, oneOf, optStr, readBody, str } from "@/server/http";
import { requireRole } from "@/server/session";
import { sellPlan } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireRole("staff");
    const b = await readBody(request);
    return sellPlan(await getDb(), s.orgId, {
      customerId: str(b, "customerId", 64),
      kind: oneOf(b, "kind", ["package", "membership"] as const),
      planId: str(b, "planId", 64),
      stylistId: optStr(b, "stylistId", 64),
      method: oneOf(b, "method", ["cash", "upi", "card"] as const),
    });
  });
}
