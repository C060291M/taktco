"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PayButton({ invoiceId, disabled }: { invoiceId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    await fetch(`/api/invoices/${invoiceId}/pay`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  if (disabled) {
    return (
      <button className="btn-secondary text-xs opacity-40 cursor-not-allowed" disabled title="Verify your business in Settings first">
        Mark as paid
      </button>
    );
  }

  return (
    <button className="btn-secondary text-xs" disabled={loading} onClick={handlePay}>
      {loading ? "Processing..." : "Mark as paid"}
    </button>
  );
}
