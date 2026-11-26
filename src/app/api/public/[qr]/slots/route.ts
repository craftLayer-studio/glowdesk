import { getDb } from "@/server/db/client";
import { BadRequest, handle, limit } from "@/server/http";
import { slots } from "@/server/store";

export async function GET(request: Request, ctx: { params: Promise<{ qr: string }> }) {
  return handle(async () => {
    limit(request, "public-read", 120);
    const q = new URL(request.url).searchParams;
    const serviceId = q.get("serviceId");
    const stylistId = q.get("stylistId");
    const date = q.get("date");
    if (!serviceId || !stylistId || !date) throw new BadRequest("serviceId, stylistId and date are required");
    return slots(await getDb(), (await ctx.params).qr, serviceId, stylistId, date);
  });
}
