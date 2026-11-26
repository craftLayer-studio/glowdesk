import { getDb } from "@/server/db/client";
import { handle, limit } from "@/server/http";
import { cancelBooking } from "@/server/store";

export async function POST(request: Request, ctx: { params: Promise<{ qr: string; token: string }> }) {
  return handle(async () => {
    limit(request, "public-write", 30);
    const { qr, token } = await ctx.params;
    return cancelBooking(await getDb(), qr, token);
  });
}
