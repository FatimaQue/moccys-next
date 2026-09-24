import MenuClient from "@/components/MenuClient";

export default function MenuPage() {
  return (
    <>
      <div className="wrap menu-head">
        <span className="eyebrow">Full Menu</span>
        <h1 className="display">Everything <span className="rust">on the menu</span></h1>
      </div>
      <MenuClient />
    </>
  );
}
