import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { requireRole } from "@/server/session";
import { clientList } from "@/server/store";

export async function GET() {
  return handle(async () => {
    const s = await requireRole("staff");
    return { clients: await clientList(await getDb(), s.orgId) };
  });
}
