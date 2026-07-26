"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

const TIERS = [
  { value: "starter", label: "Starter", price: "$89/mo" },
  { value: "pro", label: "Pro", price: "$129/mo" },
  { value: "corporate", label: "Corporate", price: "$179/mo" }
];

export function BillingPanel({
  currentTier,
  status,
  currentPeriodEnd,
  hasStripeCustomer,
  isOwner
}: {
  currentTier: string;
  status: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  isOwner: boolean;
}) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(tier: string) {
    setLoadingTier(tier);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier })
    });
    const data = await res.json().catch(() => ({}));
    setLoadingTier(null);
    if (res.ok && data.checkoutUrl) window.location.href = data.checkoutUrl;
    else setError(data.error || "Couldn't start checkout.");
  }

  async function openPortal() {
    setLoadingPortal(true);
    setError(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoadingPortal(false);
    if (res.ok && data.portalUrl) window.location.href = data.portalUrl;
    else setError(data.error || "Couldn't open the billing portal.");
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-white">Current plan</h2>
          {status && <Badge color={status === "active" ? "green" : status === "trialing" ? "blue" : "red"}>{status}</Badge>}
        </div>
        <p className="text-white text-lg font-semibold capitalize">{currentTier}</p>
        {currentPeriodEnd && (
          <p className="text-xs text-graphite-400 mt-1">
            {status === "canceled" ? "Access ends" : "Renews"} {new Date(currentPeriodEnd).toLocaleDateString()}
          </p>
        )}
        {hasStripeCustomer && isOwner && (
          <button className="btn-secondary text-sm mt-3" disabled={loadingPortal} onClick={openPortal}>
            {loadingPortal ? "Opening..." : "Manage billing (upgrade, downgrade, cancel, invoices)"}
          </button>
        )}
      </div>

      {!hasStripeCustomer && isOwner && (
        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Choose a plan</h2>
          <div className="space-y-2">
            {TIERS.map((t) => (
              <div key={t.value} className="flex items-center justify-between border-b border-graphite-700 last:border-0 pb-2 last:pb-0">
                <div>
                  <p className="text-white text-sm">{t.label}</p>
                  <p className="text-xs text-graphite-400">{t.price}</p>
                </div>
                <button className="btn-primary text-xs" disabled={loadingTier !== null} onClick={() => subscribe(t.value)}>
                  {loadingTier === t.value ? "..." : "Subscribe"}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-graphite-500 mt-3">7-day free trial on any plan.</p>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
