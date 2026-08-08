"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { Trash2 } from "lucide-react";

// Soft delete - same pattern as DeleteInvoiceButton/DeleteJobButton/
// DeleteEstimateButton. Owner/Admin only, enforced again server-side.
export function DeleteCampaignButton({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success(`Campaign "${campaignName}" deleted`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't delete this campaign.");
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-graphite-500 hover:text-red-400" title="Delete campaign">
        <Trash2 size={13} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs whitespace-nowrap">
      <span className="text-red-300">Delete?</span>
      <button className="text-red-400 font-medium hover:text-red-300" disabled={deleting} onClick={confirmDelete}>
        {deleting ? "..." : "Yes"}
      </button>
      <button className="text-graphite-400 hover:text-white" onClick={() => setConfirming(false)}>No</button>
    </div>
  );
}
