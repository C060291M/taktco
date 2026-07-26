"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

type Status = "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";

type CompanyPaymentInfo = {
  verificationStatus: Status;
  payoutsEnabled: boolean;
  legalBusinessName: string | null;
};

export function VerificationPanel({ initial, isOwner }: { initial: CompanyPaymentInfo; isOwner: boolean }) {
  const router = useRouter();
  const [info, setInfo] = useState(initial);
  const [legalBusinessName, setLegalBusinessName] = useState(initial.legalBusinessName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In production this calls our API only to create/fetch a Stripe Connect Account Link,
  // then redirects the owner to Stripe's hosted onboarding - that's where EIN/SSN and
  // bank details are actually collected, directly by Stripe. Locally, this simulates
  // that whole round trip and completes verification immediately so the rest of the
  // app (the payment gate on Invoices) can be built and tested end to end.
  async function startVerification(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/company/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legalBusinessName })
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setInfo(data);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
    }
  }

  if (info.verificationStatus === "VERIFIED") {
    return (
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Verified for payments</h2>
          <Badge color="green">Verified</Badge>
        </div>
        <p className="text-sm text-graphite-300">{info.legalBusinessName}</p>
        <p className="text-xs text-graphite-500 pt-2 border-t border-graphite-700">
          Your customers can now pay invoices directly through NovaOS. Funds settle to the bank account on file.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={startVerification} className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">Set up payment collection</h2>
        <Badge color="gray">Not started</Badge>
      </div>
      {!isOwner ? (
        <p className="text-sm text-graphite-400">Only the account owner can complete payment verification.</p>
      ) : (
        <>
          <p className="text-xs text-graphite-400">
            Enter your legal business name to continue. You'll then complete identity and bank verification on a
            secure page hosted by our payment processor — your tax ID and bank details are never stored by NovaOS.
          </p>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Legal business name</label>
            <input
              className="input"
              value={legalBusinessName}
              onChange={(e) => setLegalBusinessName(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Redirecting..." : "Continue to verification"}
          </button>
          <p className="text-[11px] text-graphite-500">
            Local dev note: this completes instantly here instead of redirecting to a real hosted verification flow.
          </p>
        </>
      )}
    </form>
  );
}
