import { getDb } from "@/server/db/client";
import { bool, handle, int, readBody, str } from "@/server/http";
import { requireRole } from "@/server/session";
import { staffBook } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireRole("staff");
    const b = await readBody(request);
    return staffBook(await getDb(), s.orgId, {
      name: str(b, "name", 60),
      phone: str(b, "phone", 20),
      serviceId: str(b, "serviceId", 64),
      stylistId: str(b, "stylistId", 64),
      startAt: int(b, "startAt"),
      consentServiceUpdates: bool(b, "consentServiceUpdates"),
      consentMarketing: bool(b, "consentMarketing"),
    });
  });
}
