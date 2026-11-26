import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { requireRole } from "@/server/session";
import { listOutbox } from "@/server/store";

export async function GET() {
  return handle(async () => {
    const s = await requireRole("owner");
    const rows = await listOutbox(await getDb(), s.orgId);
    return { messages: rows.map((r) => ({ ...r, createdAt: r.createdAt.getTime() })) };
  });
}
