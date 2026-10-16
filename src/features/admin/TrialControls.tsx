"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "start" | "extend7" | "endNow" | "remove";

// Platform-admin controls for one company's free-trial window (7 days). Changes go through
// POST /api/admin/companies/[id]/trial, which checks isPlatformAdmin itself.
export function TrialControls({
  companyId,
  trialEndsAt,
  inBeta,
  paid
}: {
  companyId: string;
  trialEndsAt: string | null;
  inBeta: boolean;
  paid: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endsAt = trialEndsAt ? new Date(trialEndsAt) : null;
  const expired = endsAt ? Date.now() >= endsAt.getTime() : false;
  const endLabel = endsAt
    ? endsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" })
    : "";

  async function run(action: Action) {
    if (action === "endNow" && !window.confirm("End this free trial now? The account becomes read-only immediately unless it has a subscription.")) return;
    if (action === "remove" && !window.confirm("Remove the free trial from this company? It stops being read-only.")) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/trial`, {
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

  const paidNote = paid ? (
    <p className="text-xs text-graphite-400">This company has an active subscription, so no trial or beta limit applies to it.</p>
  ) : null;

  if (!endsAt) {
    return (
      <div className="space-y-3">
        {paidNote}
        {inBeta ? (
          <p className="text-sm text-graphite-300">This company is in the closed beta. Remove the beta first if you want it on a free trial instead.</p>
        ) : (
          <>
            <p className="text-sm text-graphite-300">Not on a free trial. Starting one gives this company 7 days from today, then it becomes read-only unless it subscribes.</p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => run("start")}>
              {busy === "start" ? "Starting..." : "Start 7-day trial"}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paidNote}
      <p className="text-sm text-graphite-300">
        {expired ? `Ended on ${endLabel}. The account is read-only unless it subscribes.` : `Ends on ${endLabel}.`}
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => run("extend7")}>
          {busy === "extend7" ? "Working..." : "Extend +7 days"}
        </button>
        {!expired && (
          <button className="btn-secondary text-xs border-red-500/50 text-red-400" disabled={busy !== null} onClick={() => run("endNow")}>
            {busy === "endNow" ? "Working..." : "End now"}
          </button>
        )}
        <button className="btn-secondary text-xs" disabled={busy !== null} onClick={() => run("remove")}>
          {busy === "remove" ? "Working..." : "Remove trial"}
        </button>
      </div>
    </div>
  );
}