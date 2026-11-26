import { getDb } from "@/server/db/client";
import { BadRequest, handle } from "@/server/http";
import { requireRole } from "@/server/session";
import { settings, slots } from "@/server/store";

export async function GET(request: Request) {
  return handle(async () => {
    const s = await requireRole("staff");
    const q = new URL(request.url).searchParams;
    const serviceId = q.get("serviceId");
    const stylistId = q.get("stylistId");
    const date = q.get("date");
    if (!serviceId || !stylistId || !date) throw new BadRequest("serviceId, stylistId and date are required");
    const db = await getDb();
    const org = await settings(db, s.orgId);
    return slots(db, org.qrToken, serviceId, stylistId, date);
  });
}
