"use client";
import { useEffect } from "react";

// Renders nothing. Mounted by the dashboard layout only when the session cookie's
// beta claim has drifted from the database; asks the server to re-issue the cookie.
export function BetaSessionSync() {
  useEffect(() => {
    fetch("/api/auth/refresh-session", { method: "POST" }).catch(function () {});
  }, []);
  return null;
}