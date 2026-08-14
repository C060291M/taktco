"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function EstimateActions({ estimateId, status, hasJob }: { estimateId: string; status: string; hasJob: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(newStatus: string) {
    setLoading(true);
    await fetch(`/api/estimates/${estimateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    setLoading(false);
    router.refresh();
  }

  if (status === "APPROVED") {
    return (
      <p className="text-sm text-emerald-400">
        Approved{hasJob ? " — a job has been created from this estimate." : "."}
      </p>
    );
  }
  if (status === "DECLINED") {
    return <p className="text-sm text-red-400">This estimate was declined.</p>;
  }

  return (
    <div className="flex gap-2">
      {status === "DRAFT" && (
        <button className="btn-secondary" disabled={loading} onClick={() => setStatus("SENT")}>Mark as sent</button>
      )}
      <button className="btn-primary" disabled={loading} onClick={() => setStatus("APPROVED")}>
        Approve (simulates customer approval)
      </button>
      <button className="btn-secondary" disabled={loading} onClick={() => setStatus("DECLINED")}>Decline</button>
    </div>
  );
}
