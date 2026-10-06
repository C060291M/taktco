"use client";
import { useEffect } from "react";

// Fires one anonymous page-view beacon when the page loads in a real
// browser. Renders nothing. Bots that don't run JavaScript never trigger it.
export function PageViewTracker({ path }: { path: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer: document.referrer || null, utmSource: params.get("utm_source") }),
      keepalive: true
    }).catch(function () {});
  }, [path]);
  return null;
}