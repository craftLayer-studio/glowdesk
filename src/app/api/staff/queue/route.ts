import { getDb } from "@/server/db/client";
import { bool, handle, optStr, readBody, str } from "@/server/http";
import { requireRole } from "@/server/session";
import { staffAddWalkIn } from "@/server/store";

/** Reception adds a walk-in by hand. */
export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireRole("staff");
    const b = await readBody(request);
    return staffAddWalkIn(await getDb(), s.orgId, {
      name: str(b, "name", 60),
      phone: str(b, "phone", 20),
      serviceId: str(b, "serviceId", 64),
      preferredStylistId: optStr(b, "preferredStylistId", 64),
      consentServiceUpdates: bool(b, "consentServiceUpdates"),
      consentMarketing: bool(b, "consentMarketing"),
    });
  });
}
