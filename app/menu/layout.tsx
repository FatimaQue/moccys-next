import "./menu.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pg-menu">
      <Nav />
      {children}
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
