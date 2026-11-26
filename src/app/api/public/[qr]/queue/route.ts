import { getDb } from "@/server/db/client";
import { bool, handle, limit, optStr, readBody, str } from "@/server/http";
import { joinQueue } from "@/server/store";

export async function POST(request: Request, ctx: { params: Promise<{ qr: string }> }) {
  return handle(async () => {
    limit(request, "public-write", 30);
    const b = await readBody(request);
    return joinQueue(await getDb(), (await ctx.params).qr, {
      name: str(b, "name", 60),
      phone: str(b, "phone", 20),
      serviceId: str(b, "serviceId", 64),
      preferredStylistId: optStr(b, "preferredStylistId", 64),
      consentServiceUpdates: bool(b, "consentServiceUpdates"),
      consentMarketing: bool(b, "consentMarketing"),
    });
  });
}
