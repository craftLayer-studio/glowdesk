import { getDb } from "@/server/db/client";
import { handle, oneOf, readBody } from "@/server/http";
import { requireRole } from "@/server/session";
import { moveAppointment } from "@/server/store";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireRole("staff");
    const b = await readBody(request);
    return moveAppointment(await getDb(), s.orgId, (await ctx.params).id, oneOf(b, "to", ["checked_in", "cancelled", "no_show"] as const));
  });
}
