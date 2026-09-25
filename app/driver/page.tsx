import { redirect } from "next/navigation";
import "../admin/admin.css";
import "./driver.css";
import DriverClient from "@/components/DriverClient";
import { getStaff } from "@/lib/adminAuth";

export const metadata = { title: "mccoy's — Driver" };

export default async function DriverPage() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (staff.role !== "driver") redirect("/admin");
  return (
    <div className="pg-admin pg-driver">
      <DriverClient />
    </div>
  );
}
