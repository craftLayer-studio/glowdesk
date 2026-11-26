import { getDb } from "@/server/db/client";
import { handle, readBody } from "@/server/http";
import { requireRole } from "@/server/session";
import { listServices, saveService } from "@/server/store";
import { parseService } from "./parse";

export async function GET() {
  return handle(async () => {
    const s = await requireRole("owner");
    return { services: await listServices(await getDb(), s.orgId) };
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireRole("owner");
    return saveService(await getDb(), s.orgId, null, parseService(await readBody(request)));
  });
}
