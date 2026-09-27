import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// the signed-in customer's own orders, found by the mobile number they verified on WhatsApp
export async function GET() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const phone = user?.user_metadata?.phone;
  if (!user || user.user_metadata?.role !== "customer" || typeof phone !== "string") {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  const { data: orders, error } = await supabaseAdmin()
    .from("orders")
    .select("order_no, status, order_type, total, created_at")
    .eq("mobile", phone)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("account orders failed", error.message);
    return NextResponse.json({ error: "Could not load your orders." }, { status: 500 });
  }
  return NextResponse.json({ orders });
}
