import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { requireRole } from "@/server/session";
import { sendOwnerSummary } from "@/server/store";

export async function POST() {
  return handle(async () => {
    const s = await requireRole("owner");
    return sendOwnerSummary(await getDb(), s.orgId);
  });
}
