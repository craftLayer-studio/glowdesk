import { getDb } from "@/server/db/client";
import { handle, limit, readBody, str } from "@/server/http";
import { optOutByToken } from "@/server/store";

export async function POST(request: Request, ctx: { params: Promise<{ qr: string }> }) {
  return handle(async () => {
    limit(request, "public-write", 30);
    const b = await readBody(request);
    return optOutByToken(await getDb(), (await ctx.params).qr, str(b, "token", 64));
  });
}
