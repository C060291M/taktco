"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

export function GenerateDepositInvoicesButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const res = await fetch(`/api/jobs/${jobId}/deposit-invoices`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      toast.success("Deposit and remaining-balance invoices created.");
      router.refresh();
    } else {
      const data = await res.json().catch(function () { return {}; });
      toast.error(data.error || "Couldn't generate invoices.");
    }
  }

  return (
    <button className="btn-secondary text-xs" disabled={loading} onClick={handleGenerate}>
      {loading ? "Generating..." : "Generate Deposit + Balance Invoices"}
    </button>
  );
}