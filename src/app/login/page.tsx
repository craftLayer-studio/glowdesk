import { LoginView } from "@/components/LoginView";

export const metadata = { title: "Staff sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginView next={typeof next === "string" ? next : ""} />;
}
