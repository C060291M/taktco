"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { Trash2 } from "lucide-react";

// Soft delete - the invoice record and its number stay in the database for
// accounting history, just hidden from active views. Owner/Admin only,
// enforced again server-side regardless of what this button shows.
export function DeleteInvoiceButton({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success(`Invoice ${invoiceNumber || ""} deleted`);
      router.push("/invoices");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't delete this invoice.");
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn-secondary text-xs flex items-center gap-1 text-red-400 hover:text-red-300">
        <Trash2 size={13} /> Delete
      </button>
    );
  }

  return (
    <div className="card p-3 border-red-500/40 bg-red-500/5 flex items-center gap-2 text-xs">
      <span className="text-red-300">Delete invoice {invoiceNumber}? It stays in your records, just hidden from active lists.</span>
      <button className="text-red-400 font-medium hover:text-red-300" disabled={deleting} onClick={confirmDelete}>
        {deleting ? "Deleting..." : "Confirm"}
      </button>
      <button className="text-graphite-400 hover:text-white" onClick={() => setConfirming(false)}>Cancel</button>
    </div>
  );
}
