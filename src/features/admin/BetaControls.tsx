"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "enroll" | "extend14" | "extend30" | "endNow" | "unenroll";

// Platform-admin controls for one company's closed-beta window. All changes go
// through POST /api/admin/companies/[id]/beta, which checks isPlatformAdmin itself.
export function BetaControls({ companyId, betaEndsAt }: { companyId: string; betaEndsAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endsAt = betaEndsAt ? new Date(betaEndsAt) : null;
  const expired = endsAt ? Date.now() >= endsAt.getTime() : false;
  const endLabel = endsAt
    ? endsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" })
    : "";

  async function run(action: Action) {
    if (action === "endNow" && !window.confirm("End this beta now? The account becomes read-only immediately.")) return;
    if (action === "unenroll" && !window.confirm("Remove this company from the beta? It stops being read-only and frees one of the four beta slots.")) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/beta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
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
    setBusy(null);
  }

  if (!endsAt) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-graphite-300">Not in the closed beta. Enrolling starts a 30-day window today and uses one of the four beta slots.</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => run("enroll")}>
          {busy === "enroll" ? "Enrolling..." : "Enroll in beta (30 days)"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-graphite-300">
        {expired ? `Ended on ${endLabel}. The account is read-only.` : `Ends on ${endLabel}.`}
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => run("extend14")}>
          {busy === "extend14" ? "Working..." : "Extend +14 days"}
        </button>
        <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => run("extend30")}>
          {busy === "extend30" ? "Working..." : "Extend +30 days"}
        </button>
        {!expired && (
          <button className="btn-secondary text-xs border-red-500/50 text-red-400" disabled={busy !== null} onClick={() => run("endNow")}>
            {busy === "endNow" ? "Working..." : "End now"}
          </button>
        )}
        <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => run("unenroll")}>
          {busy === "unenroll" ? "Working..." : "Remove from beta"}
        </button>
      </div>
    </div>
  );
}