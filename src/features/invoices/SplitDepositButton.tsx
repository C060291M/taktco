"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SplitDepositButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSplit() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/invoices/${invoiceId}/split-deposit`, { method: "POST" });
    const data = await res.json().catch(function () { return {}; });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(data.error || "Couldn't split invoice.");
    }
  }

  return (
    <div>
      <button className="btn-secondary text-xs" disabled={loading} onClick={handleSplit}>
        {loading ? "Splitting..." : "Split into deposit + final balance"}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}