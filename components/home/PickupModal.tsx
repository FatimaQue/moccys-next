"use client";

import { useEffect, useState } from "react";
import { gmapsSrc } from "./maps";

const BRANCHES = [
  { name: "I-8 Markaz Islamabad", lat: 33.6614, lng: 73.0836, hours: "02:00 PM – 04:00 AM", open: true },
];

export default function PickupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(15);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null); // set by "use my location"; otherwise the active branch
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("pickup-lock", open);
    if (open) setEverOpened(true); // eslint-disable-line react-hooks/set-state-in-effect -- flips once, to start loading the map lazily
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("pickup-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const branch = BRANCHES[active];
  const center = pos ?? { lat: branch.lat, lng: branch.lng };

  const choose = (i: number) => { setActive(i); setPos(null); setZoom(15); };
  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => { setZoom(15); setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); });
  };
  const q = query.trim().toLowerCase();

  return (
    <>
      <div className={"pickup-overlay" + (open ? " open" : "")} onClick={onClose}></div>
      <div className={"pickup-modal" + (open ? " open" : "")} role="dialog" aria-modal="true" aria-labelledby="pickupTitle">
        <div className="pickup-list">
          <div className="pickup-search-row">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input type="text" placeholder="Search by Branch" aria-label="Search by branch" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <h3 className="pickup-heading" id="pickupTitle">All Branches</h3>
          <div className="pickup-branches">
            {BRANCHES.map((b, i) => (
              <div
                key={b.name} onClick={() => choose(i)}
                className={"branch-item" + (i === active ? " active" : "") + (b.name.toLowerCase().includes(q) ? "" : " hidden")}
              >
                <span className="branch-ico"><svg viewBox="0 0 24 24"><path d="M4 9l1-5h14l1 5M4 9h16M4 9v10a1 1 0 001 1h4v-6h6v6h4a1 1 0 001-1V9" /></svg></span>
                <div className="branch-info">
                  <b>{b.name}</b>
                  <div className="branch-hours">{b.hours}</div>
                  <div className="branch-status"><span className="open">Open Now</span></div>
                </div>
                <span className="branch-chev"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg></span>
              </div>
            ))}
          </div>
        </div>
        <div className="pickup-map">
          <div className="pickup-zoom">
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(z + 1, 20))}>+</button>
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(z - 1, 3))}>−</button>
          </div>
          <button className="pickup-locate" aria-label="Use my current location" title="Use my current location" onClick={locate}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          </button>
          <button className="pickup-close" aria-label="Close" onClick={onClose}>&times;</button>
          <iframe title="Branch location map" loading="lazy" src={everOpened ? gmapsSrc(center.lat, center.lng, zoom) : undefined}></iframe>
        </div>
      </div>
    </>
  );
}
