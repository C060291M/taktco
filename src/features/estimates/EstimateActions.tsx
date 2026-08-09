"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function EstimateActions({ estimateId, status, hasJob }: { estimateId: string; status: string; hasJob: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

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

  async function sendToClient() {
    setSending(true);
    setSendResult(null);
    const res = await fetch(`/api/estimates/${estimateId}/send`, { method: "POST" });
    const result = await res.json();
    setSending(false);
    if (res.ok && result.sent) {
      setSendResult("Sent to the customer's email.");
      router.refresh();
    } else {
      setSendResult(result.reason || result.error || "Send failed.");
    }
  }

  if (status === "APPROVED") {
    return (
      <p className="text-sm text-emerald-400">
        Approved{hasJob ? " - a job has been created from this estimate." : "."}
      </p>
    );
  }
  if (status === "DECLINED") {
    return <p className="text-sm text-red-400">This estimate was declined.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <button className="btn-primary" disabled={sending} onClick={sendToClient}>
          {sending ? "Sending..." : "Send to client for approval"}
        </button>
        <button
          className="text-xs text-graphite-500 hover:text-graphite-300 underline"
          disabled={loading}
          onClick={() => {
            if (confirm("This marks the estimate approved WITHOUT the customer actually approving it. Only use this for a verbal/offline approval you're recording manually. Continue?")) {
              setStatus("APPROVED");
            }
          }}
        >
          Staff override: mark approved manually
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => setStatus("DECLINED")}>Decline</button>
      </div>
      {sendResult && <p className="text-xs text-graphite-400">{sendResult}</p>}
    </div>
  );
}
