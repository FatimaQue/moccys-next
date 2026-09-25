import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NOT_FOUND = "We couldn't find an order with that number and mobile. Please check both and try again.";

// Order numbers are short, so the mobile number used at checkout has to match too.
// Only what the customer needs comes back: no address, email or payment numbers.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { orderNo?: string; mobile?: string };
  const digits = String(body.orderNo ?? "").replace(/\D/g, "");
  const mobile = String(body.mobile ?? "").trim();
  if (!digits || !/^03\d{9}$/.test(mobile)) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("order_no, status, order_type, total, created_at, order_items(name, price, qty, is_addon)")
    .eq("order_no", "#" + digits)
    .eq("mobile", mobile)
    .maybeSingle();

  if (error) {
    console.error("track lookup failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  return NextResponse.json({ order: data });
}
