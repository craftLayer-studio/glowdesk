import { TicketView } from "@/components/TicketView";

export const metadata = { title: "Your queue ticket" };

export default async function Page({ params }: { params: Promise<{ qr: string; token: string }> }) {
  const { qr, token } = await params;
  return <TicketView qr={qr} token={token} />;
}
