import "../menu/menu.css";
import "./account.css";
import { redirect } from "next/navigation";
import AccountClient from "@/components/AccountClient";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import WhatsAppButton from "@/components/WhatsAppButton";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "mccoy's — My Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.user_metadata?.role !== "customer") redirect("/login");

  const m = user.user_metadata;
  const addresses = Array.isArray(m.addresses) ? (m.addresses as { label: string; address: string }[]) : [];
  return (
    <div className="pg-menu pg-account">
      <Nav />
      <AccountClient
        phone={String(m.phone ?? "")}
        initialName={String(m.full_name ?? "")}
        initialBirthday={String(m.birthday ?? "")}
        initialAddresses={addresses}
      />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
