import "../admin.css";
import AdminLogin from "@/components/AdminLogin";

export const metadata = { title: "mccoy's — Admin sign in" };

export default function AdminLoginPage() {
  return (
    <div className="pg-admin">
      <AdminLogin />
    </div>
  );
}
