import "./track.css";
import TrackClient from "@/components/TrackClient";

export const metadata = { title: "mccoy's — Track your order" };

export default function TrackPage() {
  return (
    <div className="pg-track">
      <TrackClient />
    </div>
  );
}
