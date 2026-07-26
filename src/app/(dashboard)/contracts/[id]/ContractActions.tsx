"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ContractActions({ contractId, status }: { contractId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedByName, setSignedByName] = useState("");

  async function setStatus(newStatus: string, extra?: Record<string, string>) {
    setLoading(true);
    await fetch(`/api/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...extra })
    });
    setLoading(false);
    router.refresh();
  }

  if (status === "SIGNED") return null;
  if (status === "DECLINED") return <p className="text-sm text-red-400">This contract was declined.</p>;

  if (signing) {
    return (
      <div className="card p-5 space-y-3">
        <p className="text-sm text-white font-medium">Sign this contract</p>
        <p className="text-xs text-graphite-400">
          Typing a name here is a simple typed signature, not a verified e-signature. See the disclaimer above.
        </p>
        <input
          className="input"
          placeholder="Type full name to sign"
          value={signedByName}
          onChange={(e) => setSignedByName(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setSigning(false)}>Cancel</button>
          <button
            className="btn-primary"
            disabled={loading || !signedByName.trim()}
            onClick={() => setStatus("SIGNED", { signedByName })}
          >
            {loading ? "Signing..." : "Sign"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {status === "DRAFT" && (
        <button className="btn-secondary" disabled={loading} onClick={() => setStatus("SENT")}>Mark as sent</button>
      )}
      <button className="btn-primary" disabled={loading} onClick={() => setSigning(true)}>Sign contract</button>
      <button className="btn-secondary" disabled={loading} onClick={() => setStatus("DECLINED")}>Decline</button>
    </div>
  );
}
