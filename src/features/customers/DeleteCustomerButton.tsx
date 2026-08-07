"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { Trash2 } from "lucide-react";

// The API does a soft delete (sets deletedAt + status: archived) - nothing
// is actually destroyed, and their linked estimates/jobs/invoices stay
// intact for records. Still asks for a real confirmation since "delete"
// is what the button says, and the customer disappears from every list
// immediately either way.
export function DeleteCustomerButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success(`${customerName} removed`);
      router.push("/customers");
    } else {
      toast.error("Couldn't remove this customer.");
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-graphite-500 hover:text-red-400 flex items-center gap-1 text-xs"
        title="Delete customer"
      >
        <Trash2 size={13} /> Delete
      </button>
    );
  }

  return (
    <div className="card p-3 border-red-500/40 bg-red-500/5 flex items-center gap-2 text-xs">
      <span className="text-red-300">Remove {customerName}? Their records stay archived, not destroyed.</span>
      <button className="text-red-400 font-medium hover:text-red-300" disabled={deleting} onClick={confirmDelete}>
        {deleting ? "Removing..." : "Confirm"}
      </button>
      <button className="text-graphite-400 hover:text-white" onClick={() => setConfirming(false)}>Cancel</button>
    </div>
  );
}
