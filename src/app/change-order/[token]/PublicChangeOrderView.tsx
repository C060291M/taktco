"use client";
import { useState } from "react";
import { getContrastingTextColor } from "@/lib/getContrastingTextColor";

type Company = { name: string; logoUrl: string | null; brandAccentColor: string; timeZone: string };

function money(n: number) {
  const sign = n < 0 ? "-" : "+";
  return sign + "$" + Math.abs(n).toLocaleString();
}

export function PublicChangeOrderView({
  token,
  customerName,
  company,
  description,
  amountDelta,
  status: initialStatus,
  signedByName: initialSignedByName
}: {
  token: string;
  customerName: string;
  company: Company;
  description: string;
  amountDelta: number;
  status: string;
  signedByName: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [signedByName, setSignedByName] = useState(initialSignedByName || "");
  const [signing, setSigning] = useState(false);
  const [loading, setLoading] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "approve" | "decline") {
    setLoading(action);
    setError(null);
    const res = await fetch("/api/public/change-orders/" + token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, signedByName: action === "approve" ? signedByName : undefined })
    });
    const data = await res.json().catch(function () { return {}; });
    setLoading(null);
    if (res.ok) {
      setStatus(data.status);
    } else {
      setError(data.error || "Something went wrong.");
    }
  }

  const decided = status === "APPROVED" || status === "DECLINED";

  return (
    <div className="min-h-screen bg-graphite-950 flex items-center justify-center p-4" style={{ ["--brand-accent" as string]: company.brandAccentColor, ["--brand-accent-foreground" as string]: getContrastingTextColor(company.brandAccentColor) }}>
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
          <p className="text-sm text-graphite-400">Change order for</p>
          <h1 className="text-xl font-semibold text-white mb-4">{customerName}</h1>

          <div className="mb-4">
            <p className="text-xs text-graphite-400 uppercase tracking-wide mb-1">What's changing</p>
            <p className="text-sm text-graphite-200 leading-relaxed">{description}</p>
          </div>

          <div className="flex items-center justify-between py-4 border-t border-b border-graphite-700 mb-4">
            <span className="text-graphite-300">Price adjustment</span>
            <span className={"text-xl font-semibold " + (amountDelta >= 0 ? "text-emerald-400" : "text-red-400")}>{money(amountDelta)}</span>
          </div>

          <div className="pt-2">
            {status === "APPROVED" && (
              <p className="text-emerald-400 text-sm font-medium text-center">You approved this change{signedByName ? " as " + signedByName : ""}.</p>
            )}
            {status === "DECLINED" && (
              <p className="text-red-400 text-sm font-medium text-center">You declined this change.</p>
            )}
            {!decided && !signing && (
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" disabled={loading !== null} onClick={function () { respond("decline"); }}>
                  {loading === "decline" ? "..." : "Decline"}
                </button>
                <button className="btn-primary flex-1" disabled={loading !== null} onClick={function () { setSigning(true); }}>
                  Approve change
                </button>
              </div>
            )}
            {!decided && signing && (
              <div className="space-y-3">
                <p className="text-xs text-graphite-400">Typing your name below confirms you approve this price and scope change.</p>
                <input
                  className="input w-full"
                  placeholder="Type your full name"
                  value={signedByName}
                  onChange={function (e) { setSignedByName(e.target.value); }}
                />
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" onClick={function () { setSigning(false); }}>Cancel</button>
                  <button
                    className="btn-primary flex-1"
                    disabled={loading !== null || !signedByName.trim()}
                    onClick={function () { respond("approve"); }}
                  >
                    {loading === "approve" ? "Approving..." : "Confirm approval"}
                  </button>
                </div>
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
