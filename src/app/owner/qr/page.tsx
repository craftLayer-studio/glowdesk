import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { QrSheet } from "@/components/QrSheet";
import { Shell } from "@/components/Shell";
import { appUrl } from "@/server/config";
import { getDb } from "@/server/db/client";
import { getSession } from "@/server/session";
import { settings } from "@/server/store";

export const metadata = { title: "Printable QR sheet" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/login?next=/owner/qr");
  if (s.role !== "owner") redirect("/staff");
  const org = await settings(await getDb(), s.orgId);
  const url = `${appUrl()}/q/${org.qrToken}`;
  const codes: Record<string, string> = {};
  for (const suffix of ["", "?book=1"]) {
    const svg = await QRCode.toString(url + suffix, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    codes[suffix] = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }
  return (
    <Shell role={s.role} name={s.name} active="qr">
      <QrSheet salonName={org.name} url={url} codes={codes} />
    </Shell>
  );
}
