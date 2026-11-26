import { PAYMENT_METHODS } from "@/domain";
import { getDb } from "@/server/db/client";
import { bool, handle, idList, oneOf, optStr, readBody, str } from "@/server/http";
import { requireRole } from "@/server/session";
import { checkout, previewCheckout } from "@/server/store";

/** Bill a visit. Prices and totals are always computed on the server. `preview: true` prices without saving. */
export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireRole("staff");
    const b = await readBody(request);
    const input = {
      customerId: str(b, "customerId", 64),
      stylistId: str(b, "stylistId", 64),
      serviceIds: idList(b, "serviceIds"),
      method: oneOf(b, "method", PAYMENT_METHODS),
      appointmentId: optStr(b, "appointmentId", 64),
      queueEntryId: optStr(b, "queueEntryId", 64),
    };
    const db = await getDb();
    return bool(b, "preview") ? { bill: await previewCheckout(db, s.orgId, input) } : checkout(db, s.orgId, input);
  });
}
