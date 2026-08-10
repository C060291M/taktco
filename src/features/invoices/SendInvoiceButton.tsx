"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SendInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok && data.sent) {
      setResult("Sent!");
      router.refresh();
    } else {
      setResult(data.reason || data.error || "Send failed.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="btn-secondary text-xs" disabled={loading} onClick={send}>
        {loading ? "Sending..." : "Send to customer"}
      </button>
      {result && <p className="text-[11px] text-graphite-400">{result}</p>}
    </div>
  );
}
