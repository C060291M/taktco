"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PayButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    await fetch(`/api/invoices/${invoiceId}/pay`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button className="btn-secondary text-xs" disabled={loading} onClick={handlePay}>
      {loading ? "Processing..." : "Mark as paid"}
    </button>
  );
}
