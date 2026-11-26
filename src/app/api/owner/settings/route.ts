import { getDb } from "@/server/db/client";
import { handle, int, readBody, str, text } from "@/server/http";
import { requireRole } from "@/server/session";
import { settings, updateSettings } from "@/server/store";

export async function GET() {
  return handle(async () => {
    const s = await requireRole("owner");
    return settings(await getDb(), s.orgId);
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireRole("owner");
    const b = await readBody(request);
    return updateSettings(await getDb(), s.orgId, {
      name: str(b, "name", 80),
      city: str(b, "city", 60),
      address: text(b, "address", 200),
      chairs: int(b, "chairs", 1, 50),
      openMinute: int(b, "openMinute", 0, 1440),
      closeMinute: int(b, "closeMinute", 0, 1440),
      gstPercent: int(b, "gstPercent", 0, 28),
      gstin: text(b, "gstin", 30),
      upiVpa: text(b, "upiVpa", 60),
      googleReviewUrl: text(b, "googleReviewUrl", 300),
      followUpOffer: text(b, "followUpOffer", 160),
    });
  });
}
