import { getDb } from "@/server/db/client";
import { handle, readBody } from "@/server/http";
import { requireRole } from "@/server/session";
import { saveService } from "@/server/store";
import { parseService } from "../parse";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireRole("owner");
    return saveService(await getDb(), s.orgId, (await ctx.params).id, parseService(await readBody(request)));
  });
}
