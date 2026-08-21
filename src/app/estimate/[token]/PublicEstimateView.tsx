"use client";
import { useState } from "react";
import { formatDateInTz } from "@/lib/formatDate";

type LineItem = { description: string; qty: number; unit: string; unitPrice: number };
type Company = { name: string; logoUrl: string | null; brandAccentColor: string; timeZone: string };

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function PublicEstimateView({
  token,
  customerName,
  company,
  status: initialStatus,
  totalAmount,
  lineItems,
  warranty,
  terms,
  displayMode,
  validUntil
}: {
  token: string;
  customerName: string;
  company: Company;
  status: string;
  totalAmount: number;
  lineItems: LineItem[];
  warranty: string | null;
  terms: string | null;
  displayMode: string;
  validUntil: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "approve" | "decline") {
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/public/estimates/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (res.ok) {
      setStatus(data.status);
    } else {
      setError(data.error || "Something went wrong.");
    }
  }

  const decided = status === "APPROVED" || status === "DECLINED";
  const isExpired = validUntil ? new Date(validUntil) < new Date() : false;
  const expiredDate = validUntil ? formatDateInTz(validUntil, company.timeZone) : null;

  return (
    <div className="min-h-screen bg-graphite-950 flex items-center justify-center p-4" style={{ ["--brand-accent" as string]: company.brandAccentColor }}>
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6 justify-center">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={company.name} className="h-10 w-10 rounded object-contain" />
          ) : (
            <div className="h-10 w-10 rounded bg-accent/20 flex items-center justify-center text-accent font-bold">
              {company.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="text-white font-medium text-lg">{company.name}</p>
        </div>

        <div className="card p-6" style={{ borderColor: company.brandAccentColor }}>
          <p className="text-sm text-graphite-400">Estimate for</p>
          <h1 className="text-xl font-semibold text-white mb-1">{customerName}</h1>
          {expiredDate && (
            <p className={`text-xs mb-3 ${isExpired ? "text-red-400" : "text-graphite-500"}`}>
              {isExpired ? `This estimate expired on ${expiredDate}.` : `Valid until ${expiredDate}`}
            </p>
          )}

          {displayMode === "SUMMARY" ? (
            <div className="mb-4">
              <p className="text-xs text-graphite-400 uppercase tracking-wide mb-1">Scope of work</p>
              <ul className="text-sm text-graphite-200 space-y-1">
                {lineItems.map((li, i) => (
                  <li key={i}>- {li.description}{li.qty > 1 ? ` (${li.qty} ${li.unit})` : ""}</li>
                ))}
              </ul>
            </div>
          ) : (
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left text-graphite-400 border-b border-graphite-700">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, i) => (
                  <tr key={i} className="border-b border-graphite-700 last:border-0">
                    <td className="py-2 text-graphite-100">{li.description}</td>
                    <td className="py-2 text-graphite-300">{li.qty} {li.unit}</td>
                    <td className="py-2 text-graphite-300 text-right">{money(li.qty * li.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center justify-between pb-4 border-b border-graphite-700">
            <span className="text-graphite-300">Total</span>
            <span className="text-white text-xl font-semibold">{money(totalAmount)}</span>
          </div>

          {warranty && (
            <div className="pt-4">
              <p className="text-xs text-graphite-400 uppercase tracking-wide">Warranty</p>
              <p className="text-sm text-graphite-200 mt-1">{warranty}</p>
            </div>
          )}
          {terms && (
            <div className="pt-3">
              <p className="text-xs text-graphite-400 uppercase tracking-wide">Terms</p>
              <p className="text-sm text-graphite-200 mt-1">{terms}</p>
            </div>
          )}

          <div className="pt-6">
            {status === "APPROVED" && (
              <p className="text-emerald-400 text-sm font-medium text-center">You approved this estimate. We'll be in touch to schedule.</p>
            )}
            {status === "DECLINED" && (
              <p className="text-red-400 text-sm font-medium text-center">You declined this estimate.</p>
            )}
            {!decided && isExpired && (
              <p className="text-red-400 text-sm font-medium text-center">This estimate has expired. Contact {company.name} for an updated quote.</p>
            )}
            {!decided && !isExpired && (
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" disabled={loading !== null} onClick={() => respond("decline")}>
                  {loading === "decline" ? "..." : "Decline"}
                </button>
                <button className="btn-primary flex-1" disabled={loading !== null} onClick={() => respond("approve")}>
                  {loading === "approve" ? "..." : "Approve estimate"}
                </button>
              </div>
            )}
            {error && <p className="text-xs text-red-400 mt-2 text-center">{error}</p>}
          </div>
        </div>
        <p className="text-center text-[11px] text-graphite-600 mt-4">Powered by TAKTCO</p>
      </div>
    </div>
  );
}


