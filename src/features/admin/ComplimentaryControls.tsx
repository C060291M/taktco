"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Platform-admin toggle for one company. Posts to /api/admin/companies/[id]/complimentary.
export function ComplimentaryControls({ companyId, on }: { companyId: string; on: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    if (next && !window.confirm("Make this account complimentary? It will never be locked for payment and its AI credits will never run out.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/complimentary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: next })
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Network error - try again.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={toggle}
          className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors " + (on ? "bg-green-500" : "bg-graphite-600")}
        >
          <span className={"inline-block h-5 w-5 transform rounded-full bg-white transition-transform " + (on ? "translate-x-5" : "translate-x-0.5")} />
        </button>
        <span className="text-sm text-graphite-100">{on ? "ON - free forever, unlimited AI" : "OFF - normal billing rules apply"}</span>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}