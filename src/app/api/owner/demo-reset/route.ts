import { getDb } from "@/server/db/client";
import { resetDemo } from "@/server/db/seed";
import { handle } from "@/server/http";
import { clearSessionCookie, requireRole } from "@/server/session";
import { settings, StoreError } from "@/server/store";

/** Rebuild the demo salon. Only works for the demo tenant. */
export async function POST() {
  return handle(async () => {
    const s = await requireRole("owner");
    const db = await getDb();
    const org = await settings(db, s.orgId);
    if (!org.isDemo) throw new StoreError("Only the demo salon can be reset", 403);
    await resetDemo(db);
    await clearSessionCookie();
    return { ok: true };
  });
}
