"use client";
import { useState } from "react";

export function ReturnToAdminBanner() {
  const [loading, setLoading] = useState(false);

  async function returnToAdmin() {
    setLoading(true);
    const res = await fetch("/api/admin/return-to-admin", { method: "POST" });
    if (res.ok) {
      window.location.href = "/admin";
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-3">
      <p className="text-xs text-amber-300">🧪 You're viewing this as the demo account.</p>
      <button
        onClick={returnToAdmin}
        disabled={loading}
        className="text-xs font-medium text-amber-300 underline hover:text-amber-200"
      >
        {loading ? "Returning..." : "← Return to admin"}
      </button>
    </div>
  );
}
