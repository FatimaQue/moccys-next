import { NextResponse } from "next/server";
import { customCatalog } from "@/lib/menuShared";
import { getMenuState } from "@/lib/menuStore";
import { logOrderEvent } from "@/lib/orderEvents";
import { addonCatalog, DELIVERY_FEE, menuCatalog } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  email?: string; name?: string; mobile?: string; orderType?: string; city?: string; address?: string;
  notes?: string; payMethod?: string; wallet?: string;
  items?: { name?: string; qty?: number; addon?: boolean }[];
};

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const FAILED = "Could not place your order. Please try again.";

export async function POST(req: Request) {
  let b: Body;
  try {
    b = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const name = clean(b.name, 100);
  const email = clean(b.email, 150);
  const mobile = clean(b.mobile, 11);
  const delivery = b.orderType === "delivery";
  const city = clean(b.city, 40);
  const address = clean(b.address, 250);
  const notes = clean(b.notes, 500);
  const payMethod = b.payMethod === "easypaisa" || b.payMethod === "safepay" || b.payMethod === "bank" ? b.payMethod : "cod";
  const wallet = clean(b.wallet, 30);

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return bad("Please enter your name and a valid email.");
  if (!/^03\d{9}$/.test(mobile)) return bad("Please enter a valid mobile number (03XXXXXXXXX).");
  if (b.orderType !== "delivery" && b.orderType !== "pickup") return bad("Invalid order type.");
  if (delivery && (!city || !address)) return bad("Please enter your city and address.");
  if (payMethod === "bank" && wallet.length < 4) return bad("Please enter your account number or transfer reference.");
  if (payMethod === "easypaisa" && !/^03\d{9}$/.test(wallet)) return bad("Please enter a valid EasyPaisa number.");
  // safepay needs no wallet number here — the customer picks and enters it on Safepay's hosted page

  const lines = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
  if (!lines.length) return bad("Your cart is empty.");

  // price every line from the server-side menu (built-in plus items added in inventory), not from what the browser sent
  const state = await getMenuState();
  const custom = customCatalog(state.custom);
  const off = new Set(state.unavailable);
  const items: { name: string; price: number; qty: number; is_addon: boolean }[] = [];
  for (const l of lines) {
    const qty = Number(l.qty);
    const entry = l.addon ? addonCatalog.get(String(l.name)) : (menuCatalog.get(String(l.name)) ?? custom.get(String(l.name)));
    if (!entry || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      return bad(`"${l.name}" is no longer available. Please remove it from your cart.`);
    }
    if (off.has(entry.parent)) return bad(`"${entry.parent}" is currently unavailable. Please remove it from your cart.`);
    items.push({ name: String(l.name), price: entry.price, qty, is_addon: !!l.addon });
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery_fee = delivery ? DELIVERY_FEE : 0;
  const db = supabaseAdmin();

  // the order number is what the customer sees; retry on the rare collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const order_no = "#" + String(Math.floor(100000 + Math.random() * 900000));
    const { data, error } = await db
      .from("orders")
      .insert({
        order_no, status: "pending", order_type: b.orderType, customer_name: name, email, mobile,
        city: delivery ? city : null, address: delivery ? address : null, notes: notes || null,
        pay_method: payMethod, easypaisa_number: payMethod === "easypaisa" || payMethod === "bank" ? wallet : null, // one column holds the wallet number for both
        subtotal, delivery_fee, total: subtotal + delivery_fee,
      })
      .select("id")
      .single();

    if (error?.code === "23505") continue; // order_no already taken
    if (error || !data) {
      console.error("order insert failed", error);
      return NextResponse.json({ error: FAILED }, { status: 500 });
    }

    const { error: itemsError } = await db.from("order_items").insert(items.map((i) => ({ ...i, order_id: data.id })));
    if (itemsError) {
      console.error("order items insert failed", itemsError);
      await db.from("orders").delete().eq("id", data.id); // don't leave an empty order on the admin board
      return NextResponse.json({ error: FAILED }, { status: 500 });
    }
    // For safepay the order isn't real yet until payment is confirmed, so it stays off the
    // admin board and out of the notification bell until markPaid (lib/safepay.ts) says so.
    if (payMethod !== "safepay") {
      await logOrderEvent({
        orderId: data.id, orderNo: order_no, kind: "new_order", actor: "Customer",
        message: `New order ${order_no} from ${name} — Rs. ${(subtotal + delivery_fee).toLocaleString("en-US")}, waiting for approval`,
      });
    }
    return NextResponse.json({ orderNo: order_no });
  }
  return NextResponse.json({ error: FAILED }, { status: 500 });
}
