import "../menu/menu.css";
import "./account.css";
import "../track/track.css"; // the Track Order tab reuses the tracking page's look
import { redirect } from "next/navigation";
import AccountClient from "@/components/AccountClient";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getCustomer } from "@/lib/customer";
import { readSavedAddresses } from "@/lib/savedAddresses";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "mccoy's — My Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.user_metadata?.role !== "customer") redirect("/login");

  const m = user.user_metadata;
  const customer = await getCustomer();
  // a WhatsApp account's number is the one it logged in with, so it can't be edited; an email account's is just contact info
  const phoneLocked = !!customer && !customer.email && !!customer.phone;
  const addresses = readSavedAddresses(m.addresses);
  return (
    <div className="pg-menu pg-account">
      <SiteNav />
      <AccountClient
        phone={phoneLocked ? customer.phone! : String(m.phone ?? "")}
        phoneLocked={phoneLocked}
        initialName={String(m.full_name ?? "")}
        initialBirthday={String(m.birthday ?? "")}
        initialAddresses={addresses}
        initialAvatarUrl={String(m.avatar_url ?? "")}
      />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
