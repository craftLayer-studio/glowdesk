import { Landing } from "@/components/Landing";
import { DEMO } from "@/server/demo";

export default function Page() {
  return <Landing demoQr={DEMO.qrToken} />;
}
