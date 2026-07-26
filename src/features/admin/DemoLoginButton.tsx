"use client";
import { useState } from "react";

export function DemoLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launch() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/demo-login", { method: "POST" });
    if (res.ok) {
      window.location.href = "/dashboard";
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't open the demo account.");
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <button className="btn-secondary text-xs" disabled={loading} onClick={launch}>
        {loading ? "Opening..." : "🧪 Open demo account"}
      </button>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}
