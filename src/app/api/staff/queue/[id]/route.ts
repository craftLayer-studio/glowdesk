import { getDb } from "@/server/db/client";
import { handle, oneOf, optStr, readBody } from "@/server/http";
import { requireRole } from "@/server/session";
import { moveQueue } from "@/server/store";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireRole("staff");
    const b = await readBody(request);
    return moveQueue(await getDb(), s.orgId, (await ctx.params).id, oneOf(b, "to", ["in_chair", "left"] as const), optStr(b, "stylistId", 64));
  });
}
