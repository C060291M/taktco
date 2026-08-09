"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type TeamMember = { id: string; name: string };

export function LeadQuickActions({
  leadId,
  customerPhone,
  customerEmail,
  pipelineStage,
  callMarksContacted,
  canManageSettings,
  assignedUserId,
  teamMembers,
  canDelete
}: {
  leadId: string;
  customerId: string;
  customerPhone: string | null;
  customerEmail: string | null;
  pipelineStage: string;
  callMarksContacted: boolean;
  canManageSettings: boolean;
  assignedUserId: string | null;
  teamMembers: TeamMember[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [assignee, setAssignee] = useState(assignedUserId || "");
  const [busy, setBusy] = useState(false);
  const [callToggle, setCallToggle] = useState(callMarksContacted);
  const [savingToggle, setSavingToggle] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

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

  // Only advances a lead forward from NEW_LEAD - never regresses a lead
  // that's already further along the pipeline (e.g. already in
  // NEGOTIATION shouldn't snap back to CONTACTED just because someone
  // called them again).
  function maybeMarkContacted() {
    if (pipelineStage === "NEW_LEAD") {
      fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, pipelineStage: "CONTACTED" })
      }).then(() => router.refresh());
    }
  }

  async function toggleCallSetting(checked: boolean) {
    setCallToggle(checked);
    setSavingToggle(true);
    await fetch("/api/comms-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callMarksContacted: checked })
    });
    setSavingToggle(false);
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

  async function sendEmail() {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body })
      });
      const result = await res.json();
      setSending(false);
      if (res.ok && result.sent) {
        setSendSuccess(true);
        maybeMarkContacted();
        setTimeout(() => {
          setComposeOpen(false);
          setSendSuccess(false);
          setSubject("");
          setBody("");
          router.refresh();
        }, 1200);
      } else {
        setSendError(result.reason || result.error || "Send failed.");
      }
    } catch {
      setSending(false);
      setSendError("Send failed - check your connection and try again.");
    }
  }

  return (
    <div className="card p-4 flex flex-wrap items-center gap-2">
      {customerPhone && (
        <a href={`tel:${customerPhone}`} className="btn-secondary text-xs" onClick={() => callToggle && maybeMarkContacted()}>
          Call
        </a>
      )}
      {customerPhone && (
        <a href={`sms:${customerPhone}`} className="btn-secondary text-xs" onClick={() => maybeMarkContacted()}>
          Text
        </a>
      )}
      {customerEmail && (
        <button className="btn-secondary text-xs" onClick={() => setComposeOpen(true)}>Email</button>
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

      {canManageSettings && (
        <label className="flex items-center gap-1.5 text-[11px] text-graphite-400 w-full mt-1">
          <input
            type="checkbox"
            checked={callToggle}
            disabled={savingToggle}
            onChange={(e) => toggleCallSetting(e.target.checked)}
          />
          Also mark leads Contacted when Call is clicked
        </label>
      )}

      {composeOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => !sending && setComposeOpen(false)}>
          <div className="card p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-medium text-white">Email {customerEmail}</h3>
            <input
              className="input w-full text-sm"
              placeholder="Subject"
              value={subject}
              disabled={sending}
              onChange={(e) => setSubject(e.target.value)}
            />
            <textarea
              className="input w-full text-sm min-h-[120px]"
              placeholder="Message"
              value={body}
              disabled={sending}
              onChange={(e) => setBody(e.target.value)}
            />
            {sendError && <p className="text-xs text-red-400">{sendError}</p>}
            {sendSuccess && <p className="text-xs text-teal-400">Sent!</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary text-xs" disabled={sending} onClick={() => setComposeOpen(false)}>Cancel</button>
              <button
                className="btn-primary text-xs"
                disabled={sending || !subject || !body}
                onClick={sendEmail}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
