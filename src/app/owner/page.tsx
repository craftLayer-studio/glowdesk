import { redirect } from "next/navigation";
import { OwnerApp } from "@/components/OwnerApp";
import { Shell } from "@/components/Shell";
import { getSession } from "@/server/session";

export const metadata = { title: "Owner dashboard" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/login?next=/owner");
  if (s.role !== "owner") redirect("/staff");
  return (
    <Shell role={s.role} name={s.name} active="owner">
      <OwnerApp />
    </Shell>
  );
}
