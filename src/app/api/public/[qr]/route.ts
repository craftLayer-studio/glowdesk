import { getDb } from "@/server/db/client";
import { handle, limit } from "@/server/http";
import { publicSalon } from "@/server/store";

export async function GET(request: Request, ctx: { params: Promise<{ qr: string }> }) {
  return handle(async () => {
    limit(request, "public-read", 120);
    return publicSalon(await getDb(), (await ctx.params).qr);
  });
}
