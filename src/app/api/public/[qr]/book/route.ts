import { getDb } from "@/server/db/client";
import { bool, handle, int, limit, readBody, str } from "@/server/http";
import { bookAppointment } from "@/server/store";

export async function POST(request: Request, ctx: { params: Promise<{ qr: string }> }) {
  return handle(async () => {
    limit(request, "public-write", 30);
    const b = await readBody(request);
    return bookAppointment(await getDb(), (await ctx.params).qr, {
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
