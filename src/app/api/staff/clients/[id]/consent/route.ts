import { getDb } from "@/server/db/client";
import { bool, handle, oneOf, readBody } from "@/server/http";
import { requireRole } from "@/server/session";
import { setClientConsent } from "@/server/store";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireRole("staff");
    const b = await readBody(request);
    return setClientConsent(await getDb(), s.orgId, (await ctx.params).id, oneOf(b, "purpose", ["service_updates", "marketing"] as const), bool(b, "granted"));
  });
}
