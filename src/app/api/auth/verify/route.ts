import { getDb } from "@/server/db/client";
import { handle, limit, readBody, str } from "@/server/http";
import { setSessionCookie } from "@/server/session";
import { verifyOtp } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => {
    limit(request, "otp-verify", 10);
    const b = await readBody(request);
    const s = await verifyOtp(await getDb(), str(b, "phone", 20), str(b, "code", 10));
    await setSessionCookie(s);
    return { role: s.role, name: s.name };
  });
}
