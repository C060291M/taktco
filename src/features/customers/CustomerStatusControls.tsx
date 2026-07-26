"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  estimate_pending: "Estimate Pending",
  estimate_sent: "Estimate Sent",
  negotiation: "Negotiation",
  active: "Active Customer",
  completed: "Completed",
  repeat_customer: "Repeat Customer",
  problem_client: "Problem Client",
  inactive: "Inactive",
  archived: "Archived"
};

export function CustomerStatusControls({
  customerId,
  status,
  vip,
  assignedUserId,
  teamMembers
}: {
  customerId: string;
  status: string;
  vip: boolean;
  assignedUserId: string | null;
  teamMembers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input py-1.5 text-xs w-40"
        value={status}
        disabled={busy}
        onChange={(e) => patch({ status: e.target.value })}
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select
        className="input py-1.5 text-xs w-40"
        value={assignedUserId || ""}
        disabled={busy}
        onChange={(e) => patch({ assignedUserId: e.target.value || null })}
      >
        <option value="">Unassigned</option>
        {teamMembers.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <button
        className={`btn-secondary text-xs ${vip ? "border-amber-400 text-amber-300" : ""}`}
        disabled={busy}
        onClick={() => patch({ vip: !vip })}
      >
        {vip ? "★ VIP" : "Mark VIP"}
      </button>
    </div>
  );
}
