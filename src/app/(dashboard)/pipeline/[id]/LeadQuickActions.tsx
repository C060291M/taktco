"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type TeamMember = { id: string; name: string };

export function LeadQuickActions({
  leadId,
  customerPhone,
  customerEmail,
  assignedUserId,
  teamMembers,
  canDelete
}: {
  leadId: string;
  customerId: string;
  customerPhone: string | null;
  customerEmail: string | null;
  assignedUserId: string | null;
  teamMembers: TeamMember[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [assignee, setAssignee] = useState(assignedUserId || "");
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setBusy(false);
    router.refresh();
  }

  async function archive() {
    setBusy(true);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, pipelineStage: "ARCHIVED" })
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this lead? This can't be undone.")) return;
    setBusy(true);
    await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    router.push("/pipeline");
  }

  return (
    <div className="card p-4 flex flex-wrap items-center gap-2">
      {customerPhone && (
        <a href={`tel:${customerPhone}`} className="btn-secondary text-xs">Call</a>
      )}
      {customerPhone && (
        <a href={`sms:${customerPhone}`} className="btn-secondary text-xs">Text</a>
      )}
      {customerEmail && (
        <a href={`mailto:${customerEmail}`} className="btn-secondary text-xs">Email</a>
      )}
      <select
        className="input py-1.5 text-xs w-40"
        value={assignee}
        disabled={busy}
        onChange={(e) => {
          setAssignee(e.target.value);
          patch({ assignedUserId: e.target.value || null });
        }}
      >
        <option value="">Unassigned</option>
        {teamMembers.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <button className="btn-secondary text-xs" disabled={busy} onClick={archive}>
        Archive
      </button>
      {canDelete && (
        <button className="text-xs text-red-400 hover:text-red-300 ml-auto" disabled={busy} onClick={remove}>
          Delete lead
        </button>
      )}
    </div>
  );
}
