"use client";
import { useState } from "react";

type Pkg = { id: string; name: string; credits: number; priceCents: number };

export function CreditPackageList({ packages }: { packages: Pkg[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(pkg: Pkg) {
    setLoadingId(pkg.id);
    setError(null);
    const res = await fetch("/api/credits/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id })
    });
    const data = await res.json().catch(() => ({}));
    setLoadingId(null);
    if (res.ok && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      setError(data.error || "Couldn't start checkout.");
    }
  }

  if (packages.length === 0) {
    return <p className="text-sm text-graphite-400">No credit packages configured yet.</p>;
  }

  return (
    <div className="space-y-3">
      {packages.map((pkg) => (
        <div key={pkg.id} className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-medium">{pkg.name}</p>
            <p className="text-xs text-graphite-400">{pkg.credits.toLocaleString()} credits</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">${(pkg.priceCents / 100).toFixed(2)}</span>
            <button className="btn-primary text-sm" disabled={loadingId === pkg.id} onClick={() => buy(pkg)}>
              {loadingId === pkg.id ? "..." : "Buy"}
            </button>
          </div>
        </div>
      ))}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
