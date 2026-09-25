import { redirect } from "next/navigation";
import "./admin.css";
import AdminClient from "@/components/AdminClient";
import { getStaff } from "@/lib/adminAuth";

export const metadata = { title: "mccoy's — Admin" };

export default async function AdminPage() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (staff.role === "driver") redirect("/driver");
  return (
    <div className="pg-admin">
      <AdminClient />
    </div>
  );
}
