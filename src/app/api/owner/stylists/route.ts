import { getDb } from "@/server/db/client";
import { handle, readBody } from "@/server/http";
import { requireRole } from "@/server/session";
import { listStylists, saveStylist } from "@/server/store";
import { parseStylist } from "./parse";

export async function GET() {
  return handle(async () => {
    const s = await requireRole("owner");
    return { stylists: await listStylists(await getDb(), s.orgId) };
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireRole("owner");
    return saveStylist(await getDb(), s.orgId, null, parseStylist(await readBody(request)));
  });
}
