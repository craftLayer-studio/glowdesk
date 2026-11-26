import { Suspense } from "react";
import { CustomerApp } from "@/components/CustomerApp";

export const metadata = { title: "Join the queue or book" };

export default async function Page({ params }: { params: Promise<{ qr: string }> }) {
  const { qr } = await params;
  return (
    <Suspense>
      <CustomerApp qr={qr} />
    </Suspense>
  );
}
