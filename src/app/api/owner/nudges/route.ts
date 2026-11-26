import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { requireRole } from "@/server/session";
import { dueList, runJobs } from "@/server/store";

export async function GET() {
  return handle(async () => {
    const s = await requireRole("owner");
    return { due: await dueList(await getDb(), s.orgId) };
  });
}

/** Run the daily jobs now: booking reminders and rebooking nudges (a cron would call the same use case). */
export async function POST() {
  return handle(async () => {
    const s = await requireRole("owner");
    return runJobs(await getDb(), s.orgId);
  });
}
