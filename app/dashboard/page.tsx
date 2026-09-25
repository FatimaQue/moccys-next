import { redirect } from "next/navigation";
import { getStaff } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// landing point after sign-in: send each role to its own screen
export default async function DashboardRedirect() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  redirect(staff.role === "driver" ? "/driver" : "/admin");
}
