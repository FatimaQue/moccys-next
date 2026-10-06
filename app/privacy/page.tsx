import Link from "next/link";

export const metadata = { title: "mccoy's — Privacy Policy" };

const h2 = { fontSize: 20, margin: "28px 0 8px" } as const;
const p = { lineHeight: 1.65, margin: "0 0 12px" } as const;

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 22px 80px", color: "#0A1230", fontFamily: "Mulish, sans-serif" }}>
      <Link href="/" style={{ color: "#B3122B", fontWeight: 700 }}>← Back to mccoy&apos;s</Link>
      <h1 style={{ fontSize: 34, margin: "18px 0 6px" }}>Privacy Policy</h1>
      <p style={{ ...p, color: "#5A6280" }}>Last updated: 26 September 2026</p>

      <p style={p}>This policy explains what mccoy&apos;s collects when you order food or log in on this website, and how we use it.</p>

      <h2 style={h2}>What we collect</h2>
      <p style={p}>Your mobile number (to log you in and contact you about your order), your name and delivery address (to deliver your order), and the items you order. If you log in through WhatsApp, we also receive the WhatsApp message you send us, which contains only your number and a one-time verification code.</p>

      <p style={p}>We also keep a simple visit log: which pages are opened, when, on what kind of device, and your IP address, your approximate location (country and city), your browser, what you open, search for and add to your cart, and a random ID stored in your browser, so we can count visitors, improve the menu and spot misuse. If you are signed in, that visit is linked to your account.</p>

      <h2 style={h2}>How we use it</h2>
      <p style={p}>We use your details to sign you in, prepare and deliver your order, tell you about its status, and answer your questions. We do not sell your information and we do not use it for advertising by other companies.</p>

      <h2 style={h2}>Who sees it</h2>
      <p style={p}>Our staff and delivery riders see what they need to complete your order. We use trusted services to run the site, including Supabase (database and sign-in), Vercel (hosting) and WhatsApp by Meta (login messages). They process data only to provide those services.</p>

      <h2 style={h2}>How long we keep it</h2>
      <p style={p}>Login codes expire after a few minutes. Order and account details are kept for as long as needed to run your account and meet our legal and accounting duties.</p>

      <h2 style={h2}>Your choices</h2>
      <p style={p}>You can ask us to see, correct or delete your information at any time by messaging us on WhatsApp at +92 312 3358582.</p>

      <h2 style={h2}>Changes</h2>
      <p style={p}>If we change this policy we will update the date above.</p>
    </main>
  );
}
