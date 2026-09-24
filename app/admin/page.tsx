import "./admin.css";
import AdminClient from "@/components/AdminClient";

export const metadata = { title: "mccoy's — Admin" };

export default function AdminPage() {
  return (
    <div className="pg-admin">
      <AdminClient />
    </div>
  );
}
