"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function FlagToggle({ customerId, flagged, flagReason }: { customerId: string; flagged: boolean; flagReason: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(flagReason || "");
  const [loading, setLoading] = useState(false);

  async function setFlag(next: boolean, reasonText?: string) {
    setLoading(true);
    await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagged: next, flagReason: next ? reasonText || reason : null })
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (flagged) {
    return (
      <button className="btn-secondary text-xs" disabled={loading} onClick={() => setFlag(false)}>
        {loading ? "Removing..." : "Remove flag"}
      </button>
    );
  }

  if (open) {
    return (
      <div className="flex items-center gap-2">
        <input
          className="input w-56"
          placeholder="Why flag this customer?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button className="btn-primary text-xs" disabled={loading || !reason} onClick={() => setFlag(true)}>
          {loading ? "Saving..." : "Flag"}
        </button>
        <button className="text-xs text-graphite-400" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    );
  }

  return (
    <button className="btn-secondary text-xs" onClick={() => setOpen(true)}>
      Flag as problem client
    </button>
  );
}
