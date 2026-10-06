// Client-side helper: report something a visitor did (admin "Users" page). Sends only the anonymous visitor id,
// the kind of action and its label (an item name or the search words). Never throws and never blocks the page.
export type TrackKind = "view_item" | "add_to_cart" | "search" | "checkout_start" | "order_placed";

export function trackEvent(kind: TrackKind, label?: string) {
  try {
    const vid = localStorage.getItem("moccys-visitor-id");
    if (!vid) return; // VisitTracker creates it on the first page view
    fetch("/api/visit/event", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ vid, kind, label }),
    }).catch(() => {});
  } catch { /* storage blocked: nothing to report */ }
}
