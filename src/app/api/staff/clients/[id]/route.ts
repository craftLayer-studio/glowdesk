import { getDb } from "@/server/db/client";
import { handle, readBody, text } from "@/server/http";
import { requireRole } from "@/server/session";
import { clientDetail, updateClientNotes } from "@/server/store";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireRole("staff");
    return clientDetail(await getDb(), s.orgId, (await ctx.params).id);
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireRole("staff");
    const b = await readBody(request);
    return updateClientNotes(await getDb(), s.orgId, (await ctx.params).id, text(b, "notes", 2000));
  });
}
