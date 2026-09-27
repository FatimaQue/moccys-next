"use client";

import { useState } from "react";
import AddressModal from "./home/AddressModal";
import PickupModal from "./home/PickupModal";
import Nav, { DELIVERY_ADDRESS_KEY } from "./Nav";

const readSavedAddress = () => {
  try { return localStorage.getItem(DELIVERY_ADDRESS_KEY) ?? ""; } catch { return ""; }
};

// Drop-in replacement for <Nav /> on any page that isn't the home page (which wires its own
// AddressModal/PickupModal inline) — without this, Delivery/Pick-up/the address box did nothing.
export default function SiteNav() {
  const [addrOpen, setAddrOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [address, setAddress] = useState(readSavedAddress);

  // remembered so it can be prefilled on checkout, not just shown in the nav's own address box
  const confirm = (a: string) => {
    setAddress(a);
    try { localStorage.setItem(DELIVERY_ADDRESS_KEY, a); } catch { /* storage blocked: it just won't be remembered */ }
  };

  return (
    <>
      <Nav
        onDeliveryClick={() => setAddrOpen(true)}
        onPickupClick={() => setPickupOpen(true)}
        onAddressClick={() => setAddrOpen(true)}
        address={address}
        onAddressChange={setAddress}
      />
      <AddressModal open={addrOpen} onClose={() => setAddrOpen(false)} onConfirm={confirm} />
      <PickupModal open={pickupOpen} onClose={() => setPickupOpen(false)} />
    </>
  );
}
