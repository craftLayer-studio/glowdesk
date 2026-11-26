import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { requireRole } from "@/server/session";
import { dashboard } from "@/server/store";

export async function GET(request: Request) {
  return handle(async () => {
    const s = await requireRole("owner");
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
    return dashboard(await getDb(), s.orgId, [1, 7, 30, 90].includes(days) ? days : 30);
  });
}
