import { BookingView } from "@/components/BookingView";

export const metadata = { title: "Your booking" };

export default async function Page({ params }: { params: Promise<{ qr: string; token: string }> }) {
  const { qr, token } = await params;
  return <BookingView qr={qr} token={token} />;
}
