import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PKT_HOURS = 5; // Pakistan time, no daylight saving: "today" means the restaurant's day, not UTC's
const DAY = 86_400_000;

type Row = {
  order_no: string; customer_name: string; mobile: string; easypaisa_number: string | null;
  status: string; order_type: string; pay_method: string; total: number; delivery_fee: number; created_at: string;
  order_items: { name: string; price: number; qty: number; is_addon: boolean }[];
};

const dayKey = (iso: string) => new Date(new Date(iso).getTime() + PKT_HOURS * 3_600_000).toISOString().slice(0, 10);

export async function GET(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asked = new URL(req.url).searchParams.get("date") ?? "";
  const today = dayKey(new Date().toISOString());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;
  const dayStart = new Date(`${date}T00:00:00+05:00`).getTime();
  if (Number.isNaN(dayStart)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  // one query covers the chosen day and the six before it (for the trend bars)
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("order_no, customer_name, mobile, easypaisa_number, status, order_type, pay_method, total, delivery_fee, created_at, order_items(name, price, qty, is_addon)")
    .gte("created_at", new Date(dayStart - 6 * DAY).toISOString())
    .lt("created_at", new Date(dayStart + DAY).toISOString())
    .limit(5000)
    .returns<Row[]>();
  if (error) {
    console.error("report fetch failed", error);
    return NextResponse.json({ error: "Could not load the report" }, { status: 500 });
  }

  // last seven days of revenue, oldest first (rejected orders never count as sales)
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = new Date(dayStart - (6 - i) * DAY + PKT_HOURS * 3_600_000).toISOString().slice(0, 10);
    return { date: key, revenue: 0, orders: 0 };
  });
  for (const o of data) {
    if (o.status === "rejected") continue;
    const d = days.find((x) => x.date === dayKey(o.created_at));
    if (d) { d.revenue += o.total; d.orders += 1; }
  }

  const dayOrders = data.filter((o) => dayKey(o.created_at) === date);
  const sales = dayOrders.filter((o) => o.status !== "rejected");
  const revenue = sales.reduce((s, o) => s + o.total, 0);

  const count = <K extends string>(keys: K[], pick: (o: Row) => string) =>
    Object.fromEntries(keys.map((k) => [k, dayOrders.filter((o) => pick(o) === k).length])) as Record<K, number>;

  // every payment of the day, newest first; rejected orders are listed but never counted as money in
  const payments = dayOrders
    .map((o) => ({
      orderNo: o.order_no, time: o.created_at, customer: o.customer_name, mobile: o.mobile,
      method: o.pay_method, account: o.pay_method !== "cod" ? o.easypaisa_number : null,
      amount: o.total, status: o.status,
    }))
    .sort((a, b) => b.time.localeCompare(a.time));
  const payTotal = (m: string) => sales.filter((o) => o.pay_method === m).reduce((s, o) => s + o.total, 0);

  const sold = new Map<string, { name: string; qty: number; revenue: number; addon: boolean }>();
  for (const o of sales) {
    for (const i of o.order_items) {
      const key = (i.is_addon ? "a:" : "i:") + i.name;
      const row = sold.get(key) ?? { name: i.name, qty: 0, revenue: 0, addon: i.is_addon };
      row.qty += i.qty;
      row.revenue += i.price * i.qty;
      sold.set(key, row);
    }
  }

  return NextResponse.json({
    date,
    today,
    summary: {
      orders: sales.length,
      revenue,
      average: sales.length ? Math.round(revenue / sales.length) : 0,
      deliveredRevenue: sales.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0),
      deliveryFees: sales.reduce((s, o) => s + o.delivery_fee, 0),
      itemsSold: [...sold.values()].filter((i) => !i.addon).reduce((s, i) => s + i.qty, 0),
      rejected: dayOrders.length - sales.length,
    },
    byStatus: count(["pending", "preparing", "ready", "out", "delivered", "rejected"], (o) => o.status),
    byType: count(["delivery", "pickup"], (o) => o.order_type),
    payTotals: { cod: payTotal("cod"), easypaisa: payTotal("easypaisa"), jazzcash: payTotal("jazzcash"), bank: payTotal("bank") },
    payments,
    byPay: count(["cod", "easypaisa", "jazzcash", "bank"], (o) => o.pay_method),
    items: [...sold.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue),
    days,
  });
}
