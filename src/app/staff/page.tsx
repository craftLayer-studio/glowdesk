import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { StaffApp } from "@/components/StaffApp";
import { getSession } from "@/server/session";

export const metadata = { title: "Front desk" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/login?next=/staff");
  return (
    <Shell role={s.role} name={s.name} active="staff">
      <StaffApp />
    </Shell>
  );
}
