import "./menu.css";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pg-menu">
      <SiteNav />
      {children}
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
