import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/customer";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// the signed-in customer's own orders. Matched on the contact the account has proved: an email account's verified
// email, a WhatsApp account's verified number. The phone typed into the profile form is editable, so it is never used.
export async function GET() {
  const customer = await getCustomer();
  if (!customer) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const [col, who] = customer.email ? (["email", customer.email] as const) : (["mobile", customer.phone] as const);
  if (!who) return NextResponse.json({ orders: [] });

  const { data: orders, error } = await supabaseAdmin()
    .from("orders")
    .select("order_no, status, order_type, total, created_at")
    .eq(col, who)
    // an online checkout that was never paid never reached the kitchen, so it isn't an order yet
    .or("pay_method.neq.safepay,payment_status.eq.paid")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("account orders failed", error.message);
    return NextResponse.json({ error: "Could not load your orders." }, { status: 500 });
  }
  return NextResponse.json({ orders });
}
