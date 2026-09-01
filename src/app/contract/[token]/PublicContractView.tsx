"use client";
import { useState } from "react";
import { getContrastingTextColor } from "@/lib/getContrastingTextColor";

type Company = { name: string; logoUrl: string | null; brandAccentColor: string };

export function PublicContractView({
  token,
  customerName,
  company,
  title,
  content,
  status: initialStatus,
  signedByName: initialSignedByName
}: {
  token: string;
  customerName: string;
  company: Company;
  title: string;
  content: string | null;
  status: string;
  signedByName: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [signedByName, setSignedByName] = useState(initialSignedByName || "");
  const [signing, setSigning] = useState(false);
  const [loading, setLoading] = useState<"sign" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "sign" | "decline") {
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/public/contracts/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, signedByName: action === "sign" ? signedByName : undefined })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (res.ok) {
      setStatus(data.status);
    } else {
      setError(data.error || "Something went wrong.");
    }
  }

  const decided = status === "SIGNED" || status === "DECLINED";

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
          <p className="text-sm text-graphite-400">{title} for</p>
          <h1 className="text-xl font-semibold text-white mb-4">{customerName}</h1>

          <pre className="whitespace-pre-wrap font-mono text-xs text-graphite-200 bg-graphite-900 rounded-lg p-4 leading-relaxed max-h-96 overflow-y-auto">
            {content}
          </pre>

          <div className="pt-6">
            {status === "SIGNED" && (
              <p className="text-emerald-400 text-sm font-medium text-center">You signed this contract as {signedByName}.</p>
            )}
            {status === "DECLINED" && (
              <p className="text-red-400 text-sm font-medium text-center">You declined this contract.</p>
            )}
            {!decided && !signing && (
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" disabled={loading !== null} onClick={() => respond("decline")}>
                  {loading === "decline" ? "..." : "Decline"}
                </button>
                <button className="btn-primary flex-1" disabled={loading !== null} onClick={() => setSigning(true)}>
                  Sign contract
                </button>
              </div>
            )}
            {!decided && signing && (
              <div className="space-y-3">
                <p className="text-xs text-graphite-400">
                  Typing your name below is a simple typed signature, not a verified e-signature service.
                </p>
                <input
                  className="input w-full"
                  placeholder="Type your full legal name"
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" onClick={() => setSigning(false)}>Cancel</button>
                  <button
                    className="btn-primary flex-1"
                    disabled={loading !== null || !signedByName.trim()}
                    onClick={() => respond("sign")}
                  >
                    {loading === "sign" ? "Signing..." : "Confirm signature"}
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

