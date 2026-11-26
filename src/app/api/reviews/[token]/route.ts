import { getDb } from "@/server/db/client";
import { handle, int, limit, readBody, text } from "@/server/http";
import { publicReview, submitReview } from "@/server/store";

export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    limit(request, "public-read", 60);
    return publicReview(await getDb(), (await ctx.params).token);
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    limit(request, "public-write", 30);
    const b = await readBody(request);
    return submitReview(await getDb(), (await ctx.params).token, int(b, "rating", 1, 5), text(b, "comment", 1000));
  });
}
