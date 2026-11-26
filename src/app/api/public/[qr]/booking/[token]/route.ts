import { getDb } from "@/server/db/client";
import { handle, limit } from "@/server/http";
import { bookingStatus } from "@/server/store";

export async function GET(request: Request, ctx: { params: Promise<{ qr: string; token: string }> }) {
  return handle(async () => {
    limit(request, "public-read", 120);
    const { qr, token } = await ctx.params;
    return bookingStatus(await getDb(), qr, token);
  });
}
