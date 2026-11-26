import { getDb } from "@/server/db/client";
import { handle, readBody } from "@/server/http";
import { requireRole } from "@/server/session";
import { saveStylist } from "@/server/store";
import { parseStylist } from "../parse";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireRole("owner");
    return saveStylist(await getDb(), s.orgId, (await ctx.params).id, parseStylist(await readBody(request)));
  });
}
