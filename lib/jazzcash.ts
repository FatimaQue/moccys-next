import "server-only";
import crypto from "crypto";

// JazzCash Hosted Checkout (Page Redirection API). Field names/URLs match JazzCash's public
// integration guide as of writing — confirm both against the PDF JazzCash/your bank gives you
// with your merchant credentials before going live, since they occasionally revise field sets.
const SANDBOX_URL = "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";
const LIVE_URL = "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";

function config() {
  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password = process.env.JAZZCASH_PASSWORD;
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!merchantId || !password || !integritySalt || !site) return null;
  return {
    merchantId, password, integritySalt,
    live: process.env.JAZZCASH_ENV === "live",
    returnUrl: `${site}/api/payments/jazzcash/return`,
  };
}

// Lets the rest of the app check whether JazzCash is set up yet without throwing.
export function jazzcashConfigured() {
  return config() !== null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// JazzCash wants yyyyMMddHHmmss, in the server's local time.
function stamp(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// pp_SecureHash = HMAC-SHA256 of "<salt>&<value1>&<value2>&..." (values only, fields sorted by
// key alphabetically, pp_SecureHash itself excluded), keyed with the integrity salt, hex, uppercase.
function secureHash(salt: string, fields: Record<string, string>) {
  const keys = Object.keys(fields).filter((k) => k !== "pp_SecureHash").sort();
  const value = keys.map((k) => fields[k]).join("&");
  return crypto.createHmac("sha256", salt).update(`${salt}&${value}`).digest("hex").toUpperCase();
}

export function buildHostedCheckout(opts: { orderNo: string; amountPkr: number; txnRefNo: string }) {
  const cfg = config();
  if (!cfg) throw new Error("JazzCash is not configured");

  const now = new Date();
  const expiry = new Date(now.getTime() + 60 * 60 * 1000); // customer has 1 hour to complete payment

  const fields: Record<string, string> = {
    pp_Version: "1.1",
    pp_TxnType: "",
    pp_Language: "EN",
    pp_MerchantID: cfg.merchantId,
    pp_SubMerchantID: "",
    pp_Password: cfg.password,
    pp_BankID: "",
    pp_ProductID: "",
    pp_TxnRefNo: opts.txnRefNo,
    pp_Amount: String(Math.round(opts.amountPkr * 100)), // JazzCash amounts are in paisas
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: stamp(now),
    pp_BillReference: opts.orderNo,
    pp_Description: `mccoy's order ${opts.orderNo}`,
    pp_TxnExpiryDateTime: stamp(expiry),
    pp_ReturnURL: cfg.returnUrl,
    ppmpf_1: "", ppmpf_2: "", ppmpf_3: "", ppmpf_4: "", ppmpf_5: "",
  };
  fields.pp_SecureHash = secureHash(cfg.integritySalt, fields);

  return { action: cfg.live ? LIVE_URL : SANDBOX_URL, fields };
}

// Recomputes the hash over whatever JazzCash posted back and checks it against pp_SecureHash,
// so a forged or tampered callback can't mark an order paid.
export function verifyReturn(fields: Record<string, string>) {
  const cfg = config();
  const given = fields.pp_SecureHash;
  if (!cfg || !given) return false;
  try {
    const expected = secureHash(cfg.integritySalt, fields);
    const a = Buffer.from(given, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
