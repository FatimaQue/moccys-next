"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { useMenu } from "./MenuProvider";
import { supabaseBrowser } from "@/lib/supabase/browser";

export const DELIVERY_ADDRESS_KEY = "mccoysDeliveryAddress";

type NavLink = { href: string; label: string };

const MENU_LINKS: NavLink[] = [
  { href: "/#top", label: "Home" },
  { href: "/#deals", label: "Deals" },
  { href: "/#promo", label: "Offers" },
  { href: "/#footer", label: "Contact" },
];

type Props = {
  links?: NavLink[];
  /** the home page opens its own drawers/modals; without these the nav behaves as on the menu page */
  onCartClick?: () => void;
  onDeliveryClick?: () => void;
  onPickupClick?: () => void;
  onAddressClick?: () => void;
  address?: string;
  onAddressChange?: (value: string) => void;
};

export default function Nav({
  links = MENU_LINKS, onCartClick, onDeliveryClick, onPickupClick, onAddressClick, address, onAddressChange,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { count } = useCart();
  const { query, setQuery } = useMenu();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(false);
  const [fulfill, setFulfill] = useState<"delivery" | "pickup">("delivery");

  // a customer who signed in with WhatsApp gets an Account button instead of Login
  useEffect(() => {
    const sb = supabaseBrowser();
    const check = () => sb.auth.getSession().then(({ data }) => setAccount(data.session?.user.user_metadata?.role === "customer"));
    check();
    const { data: sub } = sb.auth.onAuthStateChange(check);
    return () => sub.subscription.unsubscribe();
  }, []);

  // the drawer locks page scroll while open, and Escape closes it
  useEffect(() => {
    document.body.classList.toggle("mnav-lock", open);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("mnav-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // on the menu the cart button jumps to the sidebar; elsewhere it goes to checkout
  const goToCart = () => {
    if (onCartClick) return onCartClick();
    const panel = document.querySelector(".cart-panel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    else router.push("/checkout");
  };

  const pick = (f: "delivery" | "pickup") => {
    setFulfill(f);
    (f === "delivery" ? onDeliveryClick : onPickupClick)?.();
  };

  // typing filters the menu live once you're there; from anywhere else, Enter takes you to the
  // results (the query is shared state, so it's already applied by the time the page loads)
  const searchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && pathname !== "/menu") router.push("/menu");
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <span></span><span></span><span></span>
        </button>

        <Link href="/" className="brand">
          <Image className="brand-logo" src="/images/Logo-01.png" alt="McCoy's" width={160} height={32} priority />
        </Link>

        <div className="fulfill">
          <button className={"fpill" + (fulfill === "delivery" ? " on" : "")} onClick={() => pick("delivery")}>
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2a7 7 0 00-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1114.5 9 2.5 2.5 0 0112 11.5z" /></svg>
            Delivery
          </button>
          <button className={"fpill" + (fulfill === "pickup" ? " on" : "")} onClick={() => pick("pickup")}>
            <svg viewBox="0 0 24 24"><path d="M5 7l1-4h12l1 4M5 7h14M5 7v12h14V7M9 11v4h6v-4" /></svg>
            Pick-up
          </button>
        </div>

        <div className="navfind">
          <div className="findbox findbox-search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input
              type="text" placeholder="Find in mccoy's" aria-label="Find in mccoy's"
              value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={searchKeyDown}
            />
            {query && (
              <button type="button" className="findbox-clear" aria-label="Clear search" onClick={() => setQuery("")}>&times;</button>
            )}
          </div>
          <div className="findbox findbox-loc" onClick={onAddressClick}>
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ color: "var(--muted-d)" }}><path d="M12 2a7 7 0 00-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1114.5 9 2.5 2.5 0 0112 11.5z" /></svg>
            <input
              type="text" placeholder="Enter the delivery address" aria-label="Delivery address"
              {...(onAddressChange ? { value: address ?? "", onChange: (e) => onAddressChange(e.target.value) } : {})}
            />
            <svg className="go" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </div>
        </div>

        <div className="nav-actions">
          <button className="cartbtn" aria-label={`Cart, ${count} items`} onClick={goToCart}>
            <svg viewBox="0 0 24 24"><path d="M3 4h2l2.7 11.4a2 2 0 002 1.6h7.6a2 2 0 002-1.6L21 9H6.2" /><circle cx="10" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /></svg>
            <span>Cart</span>
            <i className="cart-badge">{count}</i>
          </button>
          <Link href={account ? "/account" : "/login"} className="loginbtn">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
            <span>{account ? "Account" : "Login"}</span>
          </Link>
        </div>
      </div>

      <div className={"mnav-overlay" + (open ? " open" : "")} onClick={() => setOpen(false)}></div>
      <aside className={"mnav" + (open ? " open" : "")} aria-label="Menu">
        <div className="mnav-head">
          <Link href="/" className="brand">
            <Image className="brand-logo" src="/images/Logo-01.png" alt="McCoy's" width={160} height={32} />
          </Link>
          <button className="mnav-close" aria-label="Close menu" onClick={() => setOpen(false)}>&times;</button>
        </div>
        <nav className="mnav-links" onClick={() => setOpen(false)}>
          {links.map((l) => <Link key={l.label} href={l.href}>{l.label}</Link>)}
        </nav>
      </aside>
    </header>
  );
}
