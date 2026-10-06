"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/trackEvent";
import { useMenu } from "./MenuProvider";

const ID_KEY = "moccys-visitor-id";
const LAST_KEY = "moccys-last-tracked";
const UTM_KEY = "moccys-utm";
// staff screens aren't visits to the shop; the server skips them too
const SKIP = ["/admin", "/driver", "/dashboard"];

function visitorId() {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return null; // storage blocked: just don't track this browser
  }
}

// campaign tags on a shared link (?utm_source=instagram…) are remembered for the whole visit, since the visitor
// lands on one page and clicks on from there
function campaign() {
  try {
    const p = new URLSearchParams(location.search);
    if (p.get("utm_source") || p.get("utm_medium") || p.get("utm_campaign")) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify({ source: p.get("utm_source"), medium: p.get("utm_medium"), campaign: p.get("utm_campaign") }));
    }
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || "null");
  } catch {
    return null;
  }
}

// Reports each page the visitor opens to /api/visit (admin "Users" page), and the words they search for. It sends only
// an anonymous random id and what they looked at — nothing personal — and stays silent on any failure so it can never
// break the site.
export default function VisitTracker() {
  const pathname = usePathname();
  const { query } = useMenu();

  useEffect(() => {
    if (SKIP.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;
    const vid = visitorId();
    if (!vid) return;
    try {
      if (sessionStorage.getItem(LAST_KEY) === pathname) return; // a reload/StrictMode double-run of the same page isn't a new view
      sessionStorage.setItem(LAST_KEY, pathname);
    } catch { /* fine, worst case a page is counted twice */ }
    fetch("/api/visit", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ vid, path: pathname, ref: document.referrer || "", utm: campaign() }),
    }).catch(() => {});
  }, [pathname]);

  // a search counts once the visitor stops typing for a moment, not on every letter
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const t = setTimeout(() => trackEvent("search", term), 1500);
    return () => clearTimeout(t);
  }, [query]);

  return null;
}
