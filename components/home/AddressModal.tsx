"use client";

import { useEffect, useState } from "react";
import { gmapsSrc } from "./maps";

const DEFAULT = { lat: 33.6716, lng: 73.0498 };

export default function AddressModal({
  open, onClose, onConfirm,
}: { open: boolean; onClose: () => void; onConfirm: (address: string) => void }) {
  const [pos, setPos] = useState(DEFAULT);
  const [line, setLine] = useState("");
  // the embedded map is only requested the first time the modal opens
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("addr-lock", open);
    if (open) setEverOpened(true); // eslint-disable-line react-hooks/set-state-in-effect -- flips once, to start loading the map lazily
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("addr-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // re-centers the embedded map on the visitor's real position
  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }));
  };

  const confirm = () => {
    const v = line.trim();
    if (v) onConfirm(v);
    onClose();
  };

  return (
    <>
      <div className={"addr-overlay" + (open ? " open" : "")} onClick={onClose}></div>
      <div className={"addr-modal" + (open ? " open" : "")} role="dialog" aria-modal="true" aria-labelledby="addrTitle">
        <div className="addr-head">
          <div className="addr-head-top">
            <h3 id="addrTitle">Enter Address</h3>
            <button className="addr-close" aria-label="Close" onClick={onClose}>&times;</button>
          </div>
          <p className="addr-sub">Please allow location for free delivery and good food experience.</p>
        </div>
        <div className="addr-map-wrap">
          <div className="addr-search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input type="text" placeholder="Enter text to search" aria-label="Search address" />
          </div>
          <iframe title="Delivery location map" loading="lazy" src={everOpened ? gmapsSrc(pos.lat, pos.lng, 15) : undefined}></iframe>
          <button className="addr-locate" aria-label="Use my current location" title="Use my current location" onClick={locate}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          </button>
        </div>
        <div className="addr-foot">
          <input type="text" className="addr-input" placeholder="House / street / area" aria-label="Address line" value={line} onChange={(e) => setLine(e.target.value)} />
          <button className="btn btn-rust" onClick={confirm}>Confirm Address →</button>
        </div>
      </div>
    </>
  );
}
