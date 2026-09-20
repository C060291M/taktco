"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Type-to-confirm delete, same pattern as GitHub's "type the repo name" -
// the button stays disabled until the typed text matches the company name
// exactly, so an irreversible action can never happen from a stray click.
export function DeleteCompanyButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/companies/${companyId}/hard-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmName, reason })
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => setOpen(true)}>
        Delete this account
      </button>
    );
  }

  return (
    <div className="border border-red-500/40 rounded-lg p-4 space-y-3 bg-red-500/5">
      <p className="text-sm text-red-300 font-medium">This permanently deletes {companyName} and everything tied to it.</p>
      <p className="text-xs text-graphite-400">
        Every user, customer, lead, estimate, contract, job, invoice, payment record, and photo is destroyed. This cannot
        be undone. Only do this after the company has explicitly requested account deletion.
      </p>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Type the company name to confirm: {companyName}</label>
        <input className="input" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Reason (optional, kept in the deletion log)</label>
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Company requested account deletion via support" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          className="btn-secondary border-red-500/50 text-red-400 hover:bg-red-500/10"
          disabled={confirmName !== companyName || loading}
          onClick={handleDelete}
        >
          {loading ? "Deleting..." : "Permanently delete"}
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}