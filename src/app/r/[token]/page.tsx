import { ReviewView } from "@/components/ReviewView";

export const metadata = { title: "Rate your visit" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <ReviewView token={(await params).token} />;
}
