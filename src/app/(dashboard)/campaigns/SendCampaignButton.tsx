"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SendCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    await fetch(`/api/campaigns/${campaignId}/send`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button className="btn-secondary text-xs" disabled={loading} onClick={handleSend}>
      {loading ? "Sending..." : "Send"}
    </button>
  );
}
