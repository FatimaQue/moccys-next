import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { MenuProvider } from "@/components/MenuProvider";
import { getMenuState } from "@/lib/menuStore";

export const metadata: Metadata = {
  title: "mccoy's — Full Menu",
  description: "Burgers, pizza, pasta and bundled deals from mccoy's.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const menu = await getMenuState();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* root layout of the app router, so the fonts load on every page; the lint rule only understands pages/_document */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Caveat:wght@600;700&family=Mulish:wght@400;500;600;700;800&family=Orbitron:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <MenuProvider custom={menu.custom} unavailable={menu.unavailable}>
          <CartProvider>{children}</CartProvider>
        </MenuProvider>
      </body>
    </html>
  );
}
