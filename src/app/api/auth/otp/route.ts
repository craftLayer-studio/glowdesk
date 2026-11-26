import { demoMode } from "@/server/config";
import { getDb } from "@/server/db/client";
import { handle, limit, readBody, str } from "@/server/http";
import { requestOtp } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => {
    limit(request, "otp", 5);
    const b = await readBody(request);
    return requestOtp(await getDb(), str(b, "phone", 20), { demo: demoMode() });
  });
}
